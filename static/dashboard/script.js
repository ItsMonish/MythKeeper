document.getElementById('fileInput').addEventListener('change', function () {
    const files = this.files;
    uploadFiles(files);

});

window.onload = function() {
    fetch("/manifest")
    .then(response => {
        if(response.status === 200) return response.text();
        else if(response.status === 403) {
            alert("Unauthorized. Login in and try again");
            window.location.href = "/";
            throw new Error("Unauthorized");
        } else {
            alert("Sorry something went wrong");
            throw new Error("Something went wrong");
        }
    })
    .then(encryptedData => {
        encryptedData = encryptedData.substring(1,encryptedData.length-2)
        const key = sessionStorage.getItem("localpass");
        const combinedData = atob(encryptedData);
        const iv = combinedData.slice(0, 16); 
        const encryptedManifest = combinedData.slice(16);
        
        return decryptData(encryptedManifest, key, iv);
    })
    .then(decryptedManifest => {
        sessionStorage.setItem("manifest", decryptedManifest);
        document.getElementById("uploaded-files").innerHTML = generateTableContent('');
    })
    .catch(error => {
        console.error(error);
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

async function decryptData(encryptedData, key, iv) {
    const decodedKey = await window.crypto.subtle.importKey(
        "raw",
        hexStringToUint8Array(key),
        { name: "AES-CBC" },
        false,
        ["decrypt"]
    );
    
    const decodedIV = new Uint8Array(iv.length);
    for (let i = 0; i < iv.length; i++) {
        decodedIV[i] = iv.charCodeAt(i);
    }
    
    const decodedData = Uint8Array.from(encryptedData, c => c.charCodeAt(0));
    
    const decryptedBuffer = await window.crypto.subtle.decrypt(
        {
            name: "AES-CBC",
            iv: decodedIV
        },
        decodedKey,
        decodedData
        );

    const decoder = new TextDecoder();
    const decryptedString = decoder.decode(decryptedBuffer);

    return decryptedString;
}


async function download(resource, filePath) {
    showConfirm("Do you want to download this file?", "Download").then(response => {
        if(response) {
            fetch(`/resource/${resource}`)
            .then(response => {
                if(response.status != 200) {
                    alert("Download failed. Try again");
                    return;
                }
                return response.json();
            })
            .then(jsonContent => {
                return decryptFile(jsonContent['content'],resource);
            }).then(decryptedBuffer => {
                const decryptedBlob = new Blob([decryptedBuffer], { type: 'application/octet-stream' });    
                const downloadLink = document.createElement('a');
                downloadLink.href = window.URL.createObjectURL(decryptedBlob);
                downloadLink.download = filePath; 
                downloadLink.click();
            });
        }
    });
}

async function decryptFile(content,resource) {
    const encryptedData = atob(content);
    const combinedData = new Uint8Array(encryptedData.length);
    for (let i = 0; i < encryptedData.length; ++i) {
        combinedData[i] = encryptedData.charCodeAt(i);
    }
    const iv = combinedData.slice(0, 16);
    const encryptedDataBuffer = combinedData.slice(16);
    const detes = getFromManifest(resource);
    const key = await genKey(detes[0],detes[1])
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

function getFromManifest(resource) {
    manifest = sessionStorage.getItem("manifest");
    manifest = JSON.parse(manifest);
    for(const file of manifest['root']) {
        if(file['resource'] == resource) {
            return [file['hash'],file['salt']];
        }
    }
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
        genHTML =   `<tr>
                        <td></td>
                        <td><p>Looks like there are no files uploaded</p></td>
                        <td></td>
                        <td></td>
                        <td></td>
                    </tr>`;
    }
    for (let fileData of list) {
        if (fileData[1] != '')
            genHTML += `<tr onclick="download('${fileData[2]}','${fileData[3]?fileData[3]: fileData[0]}');">
                            <td>${getIcon(fileData[1])}</td>
                            <td>${fileData[0]}</td>
                            <td>${getNiceTime(fileData[2].split('_')[0])}</td>
                            <td>${getNiceSize(fileData[1])}</td>
                            <td><i class="fa fa-ellipsis-v" aria-hidden="true"></i></td>
                        </tr>`;
    }
    return genHTML;
}

function getIcon(size) {
    if(size != '') return '<i class="fa fa-file" aria-hidden="true"></i>'
    else return '<i class="fa fa-folder" aria-hidden="true"></i>'
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

function genResName() {
    const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
    const randomHex = Math.random().toString(16).substr(2, 6);
    return `${timestamp}_${randomHex}`;
}

function getNiceTime(timestamp) {
    const year = timestamp.slice(0, 4);
    const month = timestamp.slice(4, 6);
    const day = timestamp.slice(6, 8);
    const hours = timestamp.slice(9, 10);
    const minutes = timestamp.slice(10, 12);
    const seconds = timestamp.slice(12, 14);

    return new Date(year,month,day,hours,minutes,seconds).toLocaleString();
}

function getNiceSize(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
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
                "salt": detail[4]
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

function generateSalt() {
    const saltArray = new Uint8Array(8);
    crypto.getRandomValues(saltArray);
    return Array.from(saltArray, byte => ('0' + (byte & 0xFF).toString(16)).slice(-2)).join('');
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

async function encryptFile(file, key) {
    const iv = crypto.getRandomValues(new Uint8Array(16));
    const fileBuffer = await file.arrayBuffer();
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
    const combinedData = new Uint8Array(iv.byteLength + encryptedFileBuffer.byteLength);
    combinedData.set(iv, 0);
    combinedData.set(new Uint8Array(encryptedFileBuffer), iv.byteLength);
    const encFile = btoa(String.fromCharCode.apply(null, combinedData));
    return encFile;
}

async function logout() {
    fetch("/logout")
    .then(response => {
        if(response.status == 200) {
            sessionStorage.removeItem("un");
            sessionStorage.removeItem("localpass");
            sessionStorage.removeItem("manifest");
            window.location.href = "/";
        } else {
            alert("Logout failed try again");
        }
    });
}


async function uploadFiles(files) {
    const renamedFiles = [];
    const originalFileNames = [];
    const data = {};
    data.files = [];

    for (const file of files) {
        const gen = genResName();
        const fileHash = await getFileHash(file);
        const salt = generateSalt();
        const encKey = await genKey(fileHash,salt);
        const renamedFile = new File([file], gen, { type: file.type });
        renamedFiles.push([renamedFile,fileHash,salt]);
        if (file.webkitRelativePath == "") originalFileNames.push(file.name)
        else originalFileNames.push(file.webkitRelativePath);
        const encryptedFile = await encryptFile(renamedFile,encKey);
        data.files.push({'file': encryptedFile, 'resource': gen});
    }

    let jsonData = JSON.parse(sessionStorage.getItem("manifest"));
    let manifest = generateManifest(originalFileNames, renamedFiles, jsonData);

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

    data.manifest = encryptedData;

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
                sessionStorage.setItem("manifest",manifest);
                showNotification("Success", "Upload completed successfully");
                document.getElementById("uploaded-files").innerHTML = generateTableContent('');
            }
        });
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