async function sha256digest(text) {
    const encTxt = new TextEncoder().encode(text);
    const hashPromise = await crypto.subtle.digest("SHA-256", encTxt);
    const promiseArray = Array.from(new Uint8Array(hashPromise));
    const hash = promiseArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    return hash;
}

async function login(event) {
    event.preventDefault();
    const un = document.getElementById("username").value;
    const pw = document.getElementById("password").value;
    const localPass = document.getElementById("localpass").value;
    const hashPw = await sha256digest(pw);
    const hashlocal = await sha256digest(localPass);
    const data = {
        username: un,
        password: hashPw
    };
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    };
    fetch("/login", options)
        .then(response => {
            if (!response.ok) {
                throw new error("Response Failed")
            }
            return response.text();
        })
        .then(data => {
            sessionStorage.setItem("un", un)
            sessionStorage.setItem("localpass", hashlocal);
            window.location.href = data
        })
        .catch(error => {
            alert("There appears to be a problem with contacting server. Try again")
        });
}

function hexStringToUint8Array(hexString) {
    const length = hexString.length / 2;
    const uint8Array = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
        const byteValue = parseInt(hexString.substr(i * 2, 2), 16);
        uint8Array[i] = byteValue;
    }
    return uint8Array;
}

async function signup(event) {
    event.preventDefault();
    const un = document.getElementById("username").value;
    const pw = document.getElementById("password").value;
    const errTag = document.getElementById("errors");
    const localPass = document.getElementById("localpass").value;
    const localPassConfirm = document.getElementById("localpassconfirm").value;
    const manifest = JSON.stringify({
        "root": [],
        "shared": []
    });

    if (localPass != localPassConfirm) {
        errTag.innerHTML = "<p>Lock Passwords don't match</p>";
        return;
    }

    let con = confirm("Lock Password cannot be reset. If you forget this password, all your data will be lost.");
    if (!con) return;

    const hashPw = await sha256digest(pw);
    const hashLock = await sha256digest(localPass);

    const encoder = new TextEncoder();
    const manifestBuffer = encoder.encode(manifest);
    const hashLockBytes = hexStringToUint8Array(hashLock);
    const importedKey = await window.crypto.subtle.importKey(
        "raw",
        hashLockBytes,
        { name: "AES-CBC" },
        false,
        ["encrypt"]
    );
    const iv = window.crypto.getRandomValues(new Uint8Array(16));
    const encryptedManifest = await window.crypto.subtle.encrypt(
        {
            name: "AES-CBC",
            iv: iv
        },
        importedKey,
        manifestBuffer
    );

    const combinedData = new Uint8Array(iv.byteLength + encryptedManifest.byteLength);
    combinedData.set(iv, 0);
    combinedData.set(new Uint8Array(encryptedManifest), iv.byteLength);

    const encryptedData = btoa(String.fromCharCode.apply(null, combinedData));

    const data = {
        username: un,
        password: hashPw,
        data: encryptedData
    };

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    };

    fetch('/createUser', options)
        .then(response => {
            if (!response.ok) {
                throw new Error("Response Failed");
            }
            return response.json();
        })
        .then(jsonResponse => {
            if (jsonResponse.status == "ok") {
                alert("Account Creation successful");
                sessionStorage.setItem("localpass", hashLock);
                window.location.href = jsonResponse.redirect;
            } else {
                alert("Account Creation failed");
                if (jsonResponse.status == "duplicate") {
                    errTag.innerHTML = "There appears the username already exists. Try another";
                } else if (jsonResponse.status == "invalidUsername") {
                    errTag.innerHTML = "Invalid Username. User name should only consist of lower case alphabets and numbers and should not start with numbers. Try again";
                }
            }
        }).catch(err => {
            alert("There appears to be a problem with contacting server. Try again");
        });
}
