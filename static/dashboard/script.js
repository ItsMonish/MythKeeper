document.getElementById('fileInput').addEventListener('change', function () {
    const files = this.files;
    uploadFiles(files);
});

document.getElementById('folderInput').addEventListener('change', function () {
    const files = this.files;
    uploadFiles(files);
});

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
        if(components.length == 0) {
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
                "resource": detail[2], // Use the generated resource name
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

    let jsonData = { "root": [] };
    let manifest = generateManifest(originalFileNames, renamedFiles, jsonData); 
    formData.append('manifest', manifest);

    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (response.status == 400) {
            showNotification("Error", "No files were selected")
        } else if (response.status == 401) {
            alert("Unauthorized upload attempted. Login and try again")
        } else if (response.status == 500) {
            showNotification("Failure", "An unexpected error occurred")
        } else {
            showNotification("Success", "Upload completed successfully")
        }
    })
}