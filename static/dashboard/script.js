document.getElementById('fileInput').addEventListener('change', function () {
    const files = this.files;
    uploadFiles(files);

});

window.onload = function() {
    fetch("/manifest")
    .then(response => {
        if(response.status == 200) return response.json();
        else if(response.status == 403) {
            alert("Unauthorized. Login in and try again");
            window.location.href = "/"
        } else {
            alert("Sorry something went wrong");
        }
    })
    .then(manifest => {
        sessionStorage.setItem("manifest",manifest)
        document.getElementById("uploaded-files").innerHTML = generateTableContent('');
    });
}

function download(resource, filePath) {
    showConfirm("Do you want to download this file?", "Download").then(response => {
        if(response) {
            fetch(`/resource/${resource}`)
            .then(response => {
                if(response.status != 200) {
                    alert("Download failed. Try again");
                }
                return response.blob();
            })
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const temp = document.createElement("a");
                temp.href = url;
                temp.download = filePath;
                document.body.appendChild(temp);
                temp.click();
                temp.remove();
            });
        }
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
        let renamedFile = renamedFiles[i];
        let gen = renamedFile.name;
        detes.push([originalFileName, renamedFile.size, gen]);
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
                "size": detail[1]
            })
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

function uploadFiles(files) {
    const formData = new FormData();
    const renamedFiles = [];
    const originalFileNames = [];

    for (const file of files) {
        const gen = genResName();
        const renamedFile = new File([file], gen, { type: file.type });
        renamedFiles.push(renamedFile);
        if (file.webkitRelativePath == "") originalFileNames.push(file.name)
        else originalFileNames.push(file.webkitRelativePath);
        formData.append('files[]', renamedFile);
    }

    let jsonData = JSON.parse(sessionStorage.getItem("manifest"));
    let manifest = generateManifest(originalFileNames, renamedFiles, jsonData);
    formData.append('manifest', manifest);

    fetch('/upload', {
        method: 'POST',
        body: formData
    })
        .then(response => {
            if (response.status == 400) {
                showNotification("Error", "No files were selected");
            } else if (response.status == 401) {
                alert("Unauthorized upload attempted. Login and try again");
            } else if (response.status == 500) {
                showNotification("Failure", "An unexpected error occurred");
            } else {
                sessionStorage.setItem("manifest",manifest);
                showNotification("Success", "Upload completed successfully");
                document.getElementById("uploaded-files").innerHTML = generateTableContent('');
            }
        });
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