document.getElementById('fileInput').addEventListener('change', function () {
    const files = this.files;
    uploadFiles(files);
});

window.onload = function () {
    fetch("/manifest")
        .then(response => {
            if (response.status === 200) return response.text();
            else if (response.status === 403) {
                alert("Unauthorized. Login in and try again");
                window.location.href = "/";
                return;
            } else {
                alert("Sorry something went wrong");
                return;
            }
        })
        .then(encryptedData => {
            encryptedData = encryptedData.substring(1, encryptedData.length - 2)
            const key = sessionStorage.getItem("localpass");

            return decryptData(encryptedData, key);
        })
        .then(decryptedManifest => {
            sessionStorage.setItem("manifest", decryptedManifest);
            document.getElementById("uploaded-files").innerHTML = generateTableContent('');
        })
        .catch(error => {
            console.error(error);
        });
    fetch("/sharing")
        .then(response => {
            if (response.status != 200) return;
            else return response.json();
        })
        .then(jsonContent => {
            let manifest = sessionStorage.getItem("manifest");
            manifest = JSON.parse(manifest);
            manifest["shared"] = jsonContent;
            sessionStorage.setItem("manifest", JSON.stringify(manifest));
            document.getElementById("shared-files").innerHTML = generateSharedTableContent(jsonContent);
        })
}

function _arrayBufferToBase64(buffer) {
    var binary = '';
    var bytes = new Uint8Array(buffer);
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

async function decryptData(encryptedData, key) {
    const combinedData = atob(encryptedData);
    const iv = combinedData.slice(0, 16);
    const encrypted = combinedData.slice(16);
    const decodedKey = await window.crypto.subtle.importKey(
        "raw",
        hexStringToUint8Array(key),
        { name: 'AES-CBC' },
        false,
        ["decrypt"]
    );

    const decodedIV = new Uint8Array(iv.length);
    for (let i = 0; i < iv.length; i++) {
        decodedIV[i] = iv.charCodeAt(i);
    }
    const decodedData = Uint8Array.from(encrypted, c => c.charCodeAt(0));
    const decryptedBuffer = await window.crypto.subtle.decrypt(
        {
            name: 'AES-CBC',
            iv: decodedIV
        },
        decodedKey,
        decodedData
    );
    const decoder = new TextDecoder();
    const decryptedString = decoder.decode(decryptedBuffer);

    return decryptedString;
}

async function decryptFile(content, resource, key = '') {
    const encryptedData = atob(content);
    const combinedData = new Uint8Array(encryptedData.length);
    for (let i = 0; i < encryptedData.length; ++i) {
        combinedData[i] = encryptedData.charCodeAt(i);
    }
    const iv = combinedData.slice(0, 16);
    const encryptedDataBuffer = combinedData.slice(16);
    const detes = getFromManifest(resource);
    if (key == '') key = await genKey(detes[0], detes[1])
    const decodedKey = await window.crypto.subtle.importKey(
        "raw",
        hexStringToUint8Array(key),
        { name: "AES-CBC" },
        false,
        ["decrypt"]
    );
    const decryptedDataBuffer = await crypto.subtle.decrypt(
        {
            name: "AES-CBC",
            iv: iv
        },
        decodedKey,
        encryptedDataBuffer
    );
    return decryptedDataBuffer;
}

async function deleteAccount() {
    showConfirm("Are you sure to delete the account? All files will be deleted and this action is irreversible", "Delete")
        .then(answer => {
            if (answer) {
                let data = {
                    "resList": []
                };
                const manifest = JSON.parse(sessionStorage.getItem("manifest"));
                for (let file of manifest["root"]) {
                    data['resList'].push(file["resource"]);
                }
                fetch("/deleteAccount", {
                    method: 'POST',
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(data)
                })
                    .then(response => {
                        if (response.status == 403) {
                            alert("Invalid Action");
                            return;
                        } else if (response.status != 200) {
                            alert("Something went wrong. Try again");
                            return;
                        } else {
                            alert("Account deleted successfully. You will be redirected to the login page");
                            sessionStorage.removeItem("un");
                            sessionStorage.removeItem("manifest");
                            sessionStorage.removeItem("localpass");
                            window.location.href = "/";
                            return;
                        }
                    })
            }
        });
}

function deleteFromManifest(resource) {
    manifest = sessionStorage.getItem("manifest");
    manifest = JSON.parse(manifest);
    for (let i in manifest['root']) {
        if (manifest['root'][i]['resource'] == resource) {
            manifest['root'].splice(i, 1);
        }
    }
    manifest = JSON.stringify(manifest)
    sessionStorage.setItem("manifest", manifest);
    return manifest;
}

async function deleteRes(resource) {
    let challenge;
    data = {
        'solution': '',
        'manifest': ''
    }
    showConfirm("Are you sure you want to delete this file?", "Delete")
        .then(answer => {
            if (answer) {
                fetch(`/delete/${resource}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                })
                    .then(response => {
                        if (response.status == 403) {
                            alert("Invalid operation");
                            return;
                        }
                        return response.json();
                    })
                    .then(jsonContent => {
                        challenge = jsonContent['challenge'];
                        return solveChallenge(challenge, resource);
                    })
                    .then(sol => {
                        data['solution'] = sol;
                        modManifest = deleteFromManifest(resource);
                        encryptManifest(modManifest)
                            .then(encManifest => {
                                data['manifest'] = encManifest;
                                return data;
                            })
                            .then(data => {
                                fetch(`/delete/${resource}`, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify(data)
                                })
                                    .then(response => {
                                        if (response.status == 403) {
                                            alert("Invalid operation on file");
                                            return;
                                        } else if (response.status != 200) {
                                            alert("Operation failed. Try again");
                                            return;
                                        } else {
                                            showNotification("Success", "File deleted successfully");
                                            document.getElementById("uploaded-files").innerHTML = generateTableContent('');
                                        }
                                    });
                            });
                    })
            }
        });
}

async function deleteSharing(resource) {
    const detes = getFromSharedManifest(resource);
    let data = {
        "resHash": await sha256digest(resource),
        "challenge": "",
        "share": detes[0]
    };
    fetch("/revoke", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
        .then(response => {
            if (response.ok) return response.json();
        })
        .then(jsonContent => {
            const challenge = jsonContent["challenge"];
            data["challenge"] = challenge;

            fetch("/revoke", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            })
                .then(response => {
                    if (response.ok) showNotification("Success", "Access lost");
                    else showNotification("Failed", "Something went wrong");
                })
        });

}

async function download(resource, filePath, key = '') {
    let challenge;
    data = {
        'solution': ''
    }
    showConfirm("Do you want to download this file?", "Download").then(answer => {

        if (answer) {
            fetch(`/resource/${resource}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            })
                .then(response => {
                    if (response.status == 403) {
                        alert("Invalid access to the file");
                        return;
                    }
                    return response.json();
                })
                .then(jsonContent => {
                    challenge = jsonContent['challenge'];
                    return solveChallenge(challenge, resource, key);
                })
                .then(sol => {
                    data['solution'] = sol;
                    return data;
                }).then(data => {
                    fetch(`/resource/${resource}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(data)
                    })
                        .then(response => {
                            if (response.status != 200) {
                                alert("Download failed. Try again");
                                return;
                            }
                            return response.json();
                        })
                        .then(jsonContent => {
                            return decryptFile(jsonContent['content'], resource, key);
                        }).then(decryptedBuffer => {
                            const decryptedBlob = new Blob([decryptedBuffer], { type: 'application/octet-stream' });
                            const downloadLink = document.createElement('a');
                            downloadLink.href = window.URL.createObjectURL(decryptedBlob);
                            downloadLink.download = filePath;
                            downloadLink.click();

                        });
                });
        }

    });
}

function generateSharedTableContent(sharedManifest) {
    let content = "", fileList = [];
    if (sharedManifest.length == 0) {
        content = `<tr>
                        <td></td>
                        <td><p>Looks like there are no shared files</p></td>
                        <td></td>
                        <td></td>
                        <td></td>
                    </tr>`;
    }
    for (let file of sharedManifest) {
        fileList.push([file.name, file.size, file.resource, file.owner]);
    }
    for (let fileData of fileList) {
        content += `<tr ondblclick="sharedDownload('${fileData[2]}','${fileData[0]}');">
                    <td>${getIcon(1)}</td>
                    <td>${fileData[0]}</td>
                    <td>${fileData[3]}</td>
                    <td>${getNiceSize(fileData[1])}</td>
                    <td><button class="sharing" style="background-color: #dc3545" onclick="deleteSharing('${fileData[2]}')">Revoke</button></td>
                </tr>`;
    }
    return content;
}



async function sharedDownload(resource, filePath) {
    const detes = getFromSharedManifest(resource);
    const resHash = await sha256digest(resource);
    let key;
    let data = {
        "resHash": resHash,
        "challenge": '',
        "share": ''
    }
    fetch("/combine", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
        .then(response => {
            if (response.ok) return response.json();
        })
        .then(jsonContent => {
            const challenge = jsonContent["challenge"];
            data["challenge"] = challenge;
            data["share"] = detes[0];
            fetch("/combine", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            })
                .then(response => {
                    if (response.ok) return response.json();
                })
                .then(jsonContent => {
                    key = jsonContent["key"];
                    download(resource, filePath, key);
                })
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

async function sha256digest(text) {
    const encTxt = new TextEncoder().encode(text);
    const hashPromise = await crypto.subtle.digest("SHA-256", encTxt);
    const promiseArray = Array.from(new Uint8Array(hashPromise));
    const hash = promiseArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    return hash;
}

async function solveChallenge(challenge, resource, key = '') {
    if (key == '') {
        const detes = getFromManifest(resource);
        key = await genKey(detes[0], detes[1]);
    }
    const sol = await decryptData(challenge, key);
    return sol;
}

async function encryptFile(file, key) {
    const iv = crypto.getRandomValues(new Uint8Array(16));
    const newIV = crypto.getRandomValues(new Uint8Array(16));
    const fileBuffer = await file.arrayBuffer();
    const solution = generateRandom(16);
    const encoder = new TextEncoder();
    const encSolution = encoder.encode(solution);
    const cryptoKey = await window.crypto.subtle.importKey(
        "raw",
        hexStringToUint8Array(key),
        { name: "AES-CBC" },
        false,
        ["encrypt"]
    );
    const encryptedFileBuffer = await crypto.subtle.encrypt(
        {
            name: "AES-CBC",
            iv: iv
        },
        cryptoKey,
        fileBuffer
    );
    const challengeBuffer = await crypto.subtle.encrypt(
        {
            name: "AES-CBC",
            iv: newIV
        },
        cryptoKey,
        encSolution
    );

    const combinedData = new Uint8Array(iv.byteLength + encryptedFileBuffer.byteLength);
    combinedData.set(iv, 0);
    combinedData.set(new Uint8Array(encryptedFileBuffer), iv.byteLength);

    const combinedChallenge = new Uint8Array(newIV.byteLength + challengeBuffer.byteLength);
    combinedChallenge.set(newIV, 0);
    combinedChallenge.set(new Uint8Array(challengeBuffer), newIV.byteLength);

    const challenge = btoa(String.fromCharCode.apply(null, combinedChallenge));
    const encFile = _arrayBufferToBase64(combinedData);
    return [encFile, solution, challenge];
}

async function encryptManifest(manifest) {
    const hashLock = sessionStorage.getItem("localpass");
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
    return encryptedData;
}

async function forceUpdateManifest(manifest) {
    const encManifest = await encryptManifest(JSON.stringify(manifest));
    fetch("/update", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 'manifest': encManifest })
    })
}

function generateFromManifest(manifest) {
    const fileList = [];

    function traverseManifest(node, basePath = '') {
        if (Array.isArray(node)) {
            node.forEach(item => {
                const fullPath = basePath ? `${basePath}/${item.name}` : item.name;
                fileList.push({ path: fullPath, size: item.size, name: item.name, resource: item.resource });
            });
        } else if (typeof node === 'object') {
            Object.keys(node).forEach(key => {
                const fullPath = key === 'root' ? basePath : basePath ? `${basePath}/${key}` : key;
                traverseManifest(node[key], fullPath);
            });
        }
    }

    traverseManifest(JSON.parse(manifest));
    return fileList;
}

function generateManifest(originalFileNames, renamedFiles, jsonData) {
    let detes = [];

    for (let i = 0; i < originalFileNames.length; i++) {
        let originalFileName = originalFileNames[i];
        let renamedFile = renamedFiles[i][0];
        let fileHash = renamedFiles[i][1];
        let salt = renamedFiles[i][2];
        let gen = renamedFile.name;
        detes.push([originalFileName, renamedFile.size, gen, fileHash, salt]);
    }

    detes.forEach(detail => {
        let components = detail[0].split("/");
        let filename = components.pop();
        let current = jsonData;
        if (components.length == 0) {
            jsonData["root"].push({
                "name": filename,
                "path": detail[0],
                "resource": detail[2],
                "size": detail[1],
                "hash": detail[3],
                "salt": detail[4],
                "sharing": []
            });
        } else {
            components.forEach(component => {
                if (!(component in current)) {
                    current[component] = { "_files": [] };
                }
                current = current[component];
            });
            current["_files"].push({
                "name": filename,
                "path": detail[0],
                "resource": detail[2],
                "size": detail[1]
            });
        }
    });

    let jsonString = JSON.stringify(jsonData, null, 4);
    return jsonString;
}

function generateRandom(length) {
    const saltArray = new Uint8Array(length);
    crypto.getRandomValues(saltArray);
    return Array.from(saltArray, byte => ('0' + (byte & 0xFF).toString(16)).slice(-2)).join('');
}

function generateTableContent(depth) {
    manifest = sessionStorage.getItem("manifest");
    manifest = JSON.parse(manifest);
    function getFilesFromManifest(depth = '') {
        fileList = [];
        if (manifest == "") {
            jsonData = {};
            return []
        }
        else jsonData = manifest;
        if (depth == '') {
            for (let file of jsonData.root) {
                fileList.push([file.name, file.size, file.resource, '']);
            }
            for (let folder in jsonData) {
                if (folder != "root" && folder != "shared") fileList.push([folder, '', '', '']);
            }
        } else {
            components = depth.split('/')
            if (components.at(-1) == "") components.pop();
            node = jsonData;
            for (let comp of components) {
                if (node[comp]) node = node[comp];
                else return [];
            }
            for (let file of node._files) {
                fileList.push([file.name, file.size, file.resource, file.path]);
            }
            for (let folder in node) {
                if (folder != "_files") fileList.push([folder, '', '', depth + folder]);
            }
        }
        return fileList;
    }

    list = getFilesFromManifest(depth);
    genHTML = ""
    if (list.length == 0) {
        genHTML = `<tr>
                        <td></td>
                        <td><p>Looks like there are no files uploaded</p></td>
                        <td></td>
                        <td></td>
                        <td></td>
                    </tr>`;
    }
    for (let fileData of list) {
        if (fileData[1] != '')
            genHTML += `<tr ondblclick="download('${fileData[2]}','${fileData[3] ? fileData[3] : fileData[0]}');">
                            <td>${getIcon(fileData[1])}</td>
                            <td>${fileData[0]}</td>
                            <td>${getNiceTime(fileData[2].split('_')[0])}</td>
                            <td>${getNiceSize(fileData[1])}</td>
                            <td><button class="sharing" onclick="openSharing('${fileData[2]}')">Sharing</button></td>
                            <td onclick="deleteRes('${fileData[2]}');"><i class="fa fa-trash-o" aria-hidden="true"></i></td>
                        </tr>`;
    }
    return genHTML;
}

async function genKey(fileHash, salt) {
    const localPass = sessionStorage.getItem("localpass")
    const text = fileHash + salt + localPass;
    const encTxt = new TextEncoder().encode(text);
    const hashPromise = await crypto.subtle.digest("SHA-256", encTxt);
    const promiseArray = Array.from(new Uint8Array(hashPromise));
    const hash = promiseArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    return hash;
}

function genResName() {
    const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
    const randomHex = Math.random().toString(16).substr(2, 6);
    return `${timestamp}_${randomHex}`;
}

async function getFileHash(file) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const promiseArray = Array.from(new Uint8Array(hashBuffer));
    const hash = promiseArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    return hash;
}

function getFromManifest(resource) {
    manifest = sessionStorage.getItem("manifest");
    manifest = JSON.parse(manifest);
    for (const file of manifest['root']) {
        if (file['resource'] == resource) {
            return [file['hash'], file['salt'], file['size'], file['name']];
        }
    }
}

function getFromSharedManifest(resource) {
    manifest = sessionStorage.getItem("manifest");
    manifest = JSON.parse(manifest);
    for (const file of manifest['shared']) {
        if (file['resource'] == resource) {
            return [file['share'], file['size'], file['name']];
        }
    }
}

function getIcon(size = '') {
    if (size != '') return '<i class="fa fa-file" aria-hidden="true"></i>'
    else return '<i class="fa fa-folder" aria-hidden="true"></i>'
}

function getNiceTime(timestamp) {
    const year = timestamp.slice(0, 4);
    const month = timestamp.slice(4, 6);
    const day = timestamp.slice(6, 8);
    const hours = timestamp.slice(9, 10);
    const minutes = timestamp.slice(10, 12);
    const seconds = timestamp.slice(12, 14);

    return new Date(year, month, day, hours, minutes, seconds).toLocaleString();
}

function getNiceSize(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

async function logout() {
    fetch("/logout")
        .then(response => {
            if (response.status == 200) {
                sessionStorage.removeItem("un");
                sessionStorage.removeItem("localpass");
                sessionStorage.removeItem("manifest");
                window.location.href = "/";
            } else {
                alert("Logout failed try again");
            }
        });
}

async function openSharing(resource) {
    const closeBtn = document.querySelector(".close");
    const dialog = document.getElementById("shareDialog");
    const usernameInput = document.getElementById("usernameInput");
    const addBtn = document.getElementById("addBtn");

    closeBtn.addEventListener("click", () => {
        dialog.style.display = "none";
        document.getElementById("userList").innerHTML = "";
    });

    dialog.style.display = "block";
    let shares = [];
    let resourceHash = "";
    const detes = getFromManifest(resource);
    const key = await genKey(detes[0], detes[1]);

    let manifest = sessionStorage.getItem("manifest");
    manifest = JSON.parse(manifest);
    for (let file of manifest["root"]) {
        if (file.resource == resource && file.sharing.length != 0) {
            for (let user of file.sharing) {
                document.getElementById("userList").innerHTML += `<tr id="${user}"><td>${user}</td><td><button style="background-color='#dc3545'" onclick="removeSharing('${user}','${resource}');">Revoke</button>`
            }
        }
    }

    addBtn.addEventListener("click", () => {
        const username = usernameInput.value.trim();
        if (username === "") {
            return;
        }

        const data = {
            "key": key
        };

        fetch("/shares", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
            .then(response => {
                if (response.status == 401) {
                    console.log("Bad request. Try again");
                    return;
                } else if (response.status == 403) {
                    alert("Unauthorized server access");
                    return;
                } else if (response.status == 200) {
                    return response.json();
                }
            })
            .then(jsonContent => {
                shares = jsonContent["shares"];
            })
            .then(_ => {
                const solution = generateRandom(32);
                sha256digest(resource)
                    .then(resHash => {
                        resourceHash = resHash
                    })
                    .then(_ => {
                        const serverData = {
                            "share": shares[1],
                            "challenge": solution,
                            "resHash": resourceHash,
                            "username": username
                        };
                        const clientData = {
                            "share": shares[0],
                            "resource": resource,
                            "name": detes[3],
                            "size": detes[2],
                            "username": username
                        };

                        fetch("/serverShare", {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(serverData)
                        })
                            .then(response => {
                                if (response.status == 401) {
                                    showNotification("Failed", "The user does not exist");
                                    throw new Error();
                                } else if (response.status != 200) {
                                    alert("There was error while sharing. Try again");
                                    throw new Error();
                                }
                            })
                            .then(_ => {
                                fetch("/clientShare", {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify(clientData)
                                })
                                    .then(response => {
                                        if (response.status != 200) {
                                            alert("There was error while sharing. Try again");
                                            throw new Error();
                                        }
                                    })
                                    .then(_ => {
                                        let manifest = sessionStorage.getItem("manifest");
                                        manifest = JSON.parse(manifest);
                                        for (let i = 0; i < manifest.root.length; i++) {
                                            if (manifest.root[i].resource == resource) {
                                                manifest.root[i].sharing.push(username)
                                            }
                                        }

                                        sessionStorage.setItem("manifest", JSON.stringify(manifest));
                                        forceUpdateManifest(manifest);
                                        const listItem = document.getElementById("userList");
                                        listItem.innerHTML += `<tr id="${username}"><td>${username}</td><td><button style="background-color='#dc3545'" onclick="removeSharing('${username}','${resource}');">Revoke</button>`
                                        showNotification("Success", "File Shared with user successfully")
                                    })
                                    .catch(_ => { });
                            }).catch(_ => { });
                    })
            })
            .catch(_ => { });
    });
}

async function removeSharing(username, resource) {
    let data = {
        "resource": resource,
        "challenge": "",
        "username": username,
    };
    let resHash = await sha256digest(resource);
    fetch("/revoke", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
        .then(response => {
            if (response.ok) return response.json();
        })
        .then(jsonContent => {
            const challenge = jsonContent["challenge"];
            solveChallenge(challenge, resource)
                .then(solution => {
                    data['challenge'] = solution;
                    data.resHash = resHash;
                })
                .then(_ => {
                    fetch("/revoke", {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(data)
                    })
                        .then(response => {
                            if (response.ok) {
                                showNotification("Success", "Access Revoked");
                                const listItem = document.getElementById(username);
                                listItem.remove();
                                let manifest = JSON.parse(sessionStorage.getItem("manifest"));
                                for (let i = 0; i < manifest.root.length; i++) {
                                    if (manifest.root[i].resource == resource) {
                                        manifest.root[i].sharing.splice(manifest.root[i].sharing.indexOf(username), 1);
                                    }
                                }
                                sessionStorage.setItem("manifest", JSON.stringify(manifest));
                                forceUpdateManifest(manifest);
                            }
                            else showNotification("Failed", "Something went wrong");
                        })
                })
        });

}

async function showConfirm(message, action) {
    return new Promise((resolve) => {
        var confirmBox = document.getElementById("confirmBox");
        var confirmMessage = document.getElementById("confirmMessage");
        var confirmButton = document.getElementById("confirmButton");

        confirmMessage.textContent = message;
        confirmButton.textContent = action;

        confirmButton.onclick = function () {
            confirmBox.style.display = "none";
            resolve(true);
        };

        var cancelButton = document.getElementById("cancelButton");
        cancelButton.onclick = function () {
            confirmBox.style.display = "none";
            resolve(false);
        };

        confirmBox.style.display = "block";
    });
}

function showNotification(title, message) {
    var notification = document.getElementById("notification");
    var titleSpan = notification.querySelector(".notification-title");
    var messageSpan = notification.querySelector(".notification-message");

    titleSpan.textContent = title;
    messageSpan.textContent = message;

    notification.style.display = "block";

    setTimeout(function () {
        notification.style.display = "none";
    }, 5000);
}

async function uploadFiles(files) {
    const renamedFiles = [];
    const originalFileNames = [];
    const data = {};
    data.files = [];
    let fileContents = [];

    for (const file of files) {
        const gen = genResName();
        const fileHash = await getFileHash(file);
        const salt = generateRandom(8);
        const encKey = await genKey(fileHash, salt);
        const renamedFile = new File([file], gen, { type: file.type });
        renamedFiles.push([renamedFile, fileHash, salt]);
        if (file.webkitRelativePath == "") originalFileNames.push(file.name)
        else originalFileNames.push(file.webkitRelativePath);
        fileContents = await encryptFile(renamedFile, encKey);
        data.files.push({ 'file': fileContents[0], 'resource': gen });
    }

    let jsonData = JSON.parse(sessionStorage.getItem("manifest"));
    let manifest = generateManifest(originalFileNames, renamedFiles, jsonData);

    data.manifest = await encryptManifest(manifest);
    data.solution = fileContents[1];
    data.challenge = fileContents[2];

    fetch('/upload', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
        .then(response => {
            if (response.status == 400) {
                showNotification("Error", "No files were selected");
            } else if (response.status == 401) {
                alert("Unauthorized upload attempted. Login and try again");
            } else if (response.status == 500) {
                showNotification("Failure", "An unexpected error occurred");
            } else if (response.status == 200) {
                sessionStorage.setItem("manifest", manifest);
                showNotification("Success", "Upload completed successfully");
                document.getElementById("uploaded-files").innerHTML = generateTableContent('');
            }
        });

}