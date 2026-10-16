use crate::errors::{AppError, AppResult};

#[cfg(windows)]
#[repr(C)]
struct DATA_BLOB {
    cb_data: u32,
    pb_data: *mut u8,
}

#[cfg(windows)]
#[link(name = "crypt32")]
#[link(name = "kernel32")]
unsafe extern "system" {
    fn CryptProtectData(
        pDataIn: *const DATA_BLOB,
        szDataDescr: *const u16,
        pOptionalEntropy: *const DATA_BLOB,
        pvReserved: *mut std::ffi::c_void,
        pPromptStruct: *mut std::ffi::c_void,
        dwFlags: u32,
        pDataOut: *mut DATA_BLOB,
    ) -> i32;

    fn CryptUnprotectData(
        pDataIn: *const DATA_BLOB,
        ppszDataDescr: *mut *mut u16,
        pOptionalEntropy: *const DATA_BLOB,
        pvReserved: *mut std::ffi::c_void,
        pPromptStruct: *mut std::ffi::c_void,
        dwFlags: u32,
        pDataOut: *mut DATA_BLOB,
    ) -> i32;

    fn LocalFree(hMem: *mut std::ffi::c_void) -> *mut std::ffi::c_void;
}

#[cfg(windows)]
pub fn protect_secret(plaintext: &str) -> AppResult<Vec<u8>> {
    use std::ptr;

    let bytes = plaintext.as_bytes();
    let data_in = DATA_BLOB {
        cb_data: bytes.len() as u32,
        pb_data: bytes.as_ptr() as *mut u8,
    };
    let mut data_out = DATA_BLOB {
        cb_data: 0,
        pb_data: ptr::null_mut(),
    };

    let success = unsafe {
        CryptProtectData(
            &data_in,
            ptr::null(), // Description
            ptr::null(), // Optional entropy
            ptr::null_mut(), // Reserved
            ptr::null_mut(), // Prompt struct
            0,           // Flags
            &mut data_out,
        )
    };

    if success == 0 {
        return Err(AppError::CredentialError("Failed to encrypt secret using Windows DPAPI".into()));
    }

    let encrypted = unsafe {
        if data_out.pb_data.is_null() || data_out.cb_data == 0 {
            Vec::new()
        } else {
            std::slice::from_raw_parts(data_out.pb_data, data_out.cb_data as usize).to_vec()
        }
    };

    if !data_out.pb_data.is_null() {
        unsafe {
            LocalFree(data_out.pb_data as _);
        }
    }

    Ok(encrypted)
}

#[cfg(not(windows))]
pub fn protect_secret(plaintext: &str) -> AppResult<Vec<u8>> {
    Ok(plaintext.as_bytes().to_vec())
}

#[cfg(windows)]
pub fn unprotect_secret(encrypted_bytes: &[u8]) -> AppResult<String> {
    use std::ptr;

    if encrypted_bytes.is_empty() {
        return Ok(String::new());
    }

    let mut data_in = DATA_BLOB {
        cb_data: encrypted_bytes.len() as u32,
        pb_data: encrypted_bytes.as_ptr() as *mut u8,
    };
    let mut data_out = DATA_BLOB {
        cb_data: 0,
        pb_data: ptr::null_mut(),
    };

    let success = unsafe {
        CryptUnprotectData(
            &mut data_in,
            ptr::null_mut(), // Description
            ptr::null(),     // Optional entropy
            ptr::null_mut(), // Reserved
            ptr::null_mut(), // Prompt struct
            0,               // Flags
            &mut data_out,
        )
    };

    if success == 0 {
        return Err(AppError::CredentialError("Failed to decrypt secret using Windows DPAPI".into()));
    }

    let decrypted = unsafe {
        if data_out.pb_data.is_null() || data_out.cb_data == 0 {
            Ok(String::new())
        } else {
            let slice = std::slice::from_raw_parts(data_out.pb_data, data_out.cb_data as usize);
            String::from_utf8(slice.to_vec())
                .map_err(|e| AppError::CredentialError(format!("Decrypted data is not valid UTF-8: {}", e)))
        }
    };

    if !data_out.pb_data.is_null() {
        unsafe {
            LocalFree(data_out.pb_data as _);
        }
    }

    decrypted
}

#[cfg(not(windows))]
pub fn unprotect_secret(encrypted_bytes: &[u8]) -> AppResult<String> {
    if encrypted_bytes.is_empty() {
        return Ok(String::new());
    }
    String::from_utf8(encrypted_bytes.to_vec())
        .map_err(|e| AppError::CredentialError(format!("Decrypted data is not valid UTF-8: {}", e)))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_dpapi_roundtrip() {
        let secret = "super-secret-client-private-key-123456=";
        let encrypted = protect_secret(secret).expect("encryption should succeed");
        assert_ne!(encrypted, secret.as_bytes());
        let decrypted = unprotect_secret(&encrypted).expect("decryption should succeed");
        assert_eq!(decrypted, secret);
    }
}
