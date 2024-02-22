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
    const hashPw = await sha256digest(pw);
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
    fetch("/login",options)
    .then(response => {
        if (!response.ok) {
            throw new error("Response Failed")
        }
        return response.text();
    })
    .then(data => {
        window.location.href = data
    })
    .catch(error => {
        alert("There appears to be a problem with contacting server. Try again")
    });
}

async function signup(event) {
    event.preventDefault();
    const un = document.getElementById("username").value;
    const pw = document.getElementById("password").value;
    const confirmpw = document.getElementById("confirmpassword").value;
    const errTag = document.getElementById("errors");
    if (pw != confirmpw) {
        errTag.innerHTML = "<p>Password's don't match</p>";
        return;
    }
    const hashPw = await sha256digest(pw);
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
    fetch('/createUser',options)
    .then(response => {
        if (!response.ok) {
            throw new error("Response Failed");
        }
        return response.json();
    })
    .then(jsonResponse => {
        if (jsonResponse.status == "ok") {
            alert("Account Creation successful");
            window.location.href = jsonResponse.redirect;
        } else {
            alert("Account Creation failed");
            if (jsonResponse.status == "duplicate") {
                window.location.href = "There appears the username already exists. Try another"
            }
        }
    }).catch(err => {
        alert("There appears to be a problem with contacting server. Try again")
    })
}
