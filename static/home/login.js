async function sha256digest(text) {
    const encTxt = new TextEncoder().encode(text); 
    const hashPromise = await crypto.subtle.digest("SHA-256", encTxt); 
    const promiseArray = Array.from(new Uint8Array(hashPromise)); 
    const hash = promiseArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return hash;
}

async function calculateHash(password) {
    let hash = await sha256digest(password);
    return hash; 
}

async function login(event) {
    event.preventDefault();
    const un = document.getElementById("username").value;
    const pw = document.getElementById("password").value;
    const hashPw = await calculateHash(pw);
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
