from flask import (
    Flask,
    render_template,
    Response,
    request,
    url_for,
    session,
    redirect,
    jsonify,
)
from config import configs
from datetime import timedelta
from app.auth.login import authLogin
from app.auth.signup import createUser
from app.utils.accountChecker import userExists
from app.utils.accountDelete import accountDeleteSequence
from app.utils.challengeHelper import getChallenge, validateSolution
from app.utils.deleteHelper import deletionSeq
from app.utils.fileSaver import saveContent, writeToManifest
from app.utils.sharingHelper import getUserSharing, loseSharing, revokeSharing
from app.utils.sssHelper import createShares,combineShares, storeClientShares, storeSeverShares, verifySharedSolution, getSharedChallenge 

application = Flask(__name__)
application.secret_key = configs.SECRET_KEY
application.permanent_session_lifetime = timedelta(minutes=30)


@application.route("/")
def serveLoginPage() -> Response:
    return render_template("home.html", name=configs.HOSTING_NAME)


@application.route("/login", methods=["POST"])
def authenticateLogin():
    data = request.json
    userName, password = data["username"], data["password"]
    if session.get("username") != None:
        return url_for("serveDashboard", user=userName)
    if authLogin(userName, password):
        session["username"] = userName
        session.permanent = True
        return url_for("serveDashboard", user=userName)
    else:
        return url_for("loginError")


@application.route("/error")
def loginError():
    return render_template("home.html", name=configs.HOSTING_NAME, error="Login Failed")


@application.route("/<string:user>")
def serveDashboard(user):
    if session.get("username") == user:
        return render_template("dashboard.html")
    else:
        return redirect(url_for("loginError"))


@application.route("/logout")
def logOutUser():
    if session.get("username") != None:
        session.pop("username")
    return jsonify(), 200


@application.route("/signup")
def signUpResponse() -> Response:
    if configs.SIGNUPS == "False":
        return '<p>It appears the administrator has turned off sign ups for this hosting.\
              Contact the admininstrator. If you have login credential <a href="/">click here</a>.'
    else:
        return render_template("signup.html", name=configs.HOSTING_NAME)


@application.route("/upload", methods=["POST"])
def uploadContents():
    inbound = request.json
    if not inbound["files"]:
        return jsonify(), 400
    if session.get("username") == None:
        return jsonify(), 401
    files = inbound["files"]
    manifest = inbound["manifest"]
    challenge = inbound["challenge"]
    solution = inbound["solution"]
    opResult = saveContent(
        files, session.get("username"), manifest, challenge, solution
    )
    if opResult:
        return jsonify(), 200
    else:
        return jsonify(), 500


@application.route("/createUser", methods=["POST"])
def userCreation():
    if configs.SIGNUPS == "False":
        return jsonify(status="failed")
    else:
        data = request.json
        resp = createUser(data["username"], data["password"], data["data"])
        if resp["status"] == "ok":
            session["username"] = data["username"]
        return jsonify(resp)


@application.route("/manifest")
def getManifest():
    un = session["username"]
    manifestFile = "{}".format(un)
    manifestFile = configs.USR_DIR + manifestFile
    if not un:
        return jsonify(), 403
    with open(manifestFile) as f:
        con = f.readlines()
    con = "".join(con)
    return jsonify(con), 200


@application.route("/resource/<string:resource>", methods=["POST"])
def sendResource(resource):
    if session.get("username") != None:
        data = request.json
        if data.get("solution") == "":
            return jsonify({"challenge": getChallenge(resource)}), 200
        solution = data["solution"]
        if validateSolution(resource, solution):
            file = "{}{}".format(configs.STORAGE_DIR, resource)
            with open(file, "r") as f:
                contents = f.read()
                f.close()
            return jsonify({"content": contents}), 200
        else:
            return jsonify({}), 403
    else:
        return jsonify(), 403


@application.route("/delete/<string:resource>", methods=["POST"])
def deleteResource(resource):
    if session.get("username") != None:
        data = request.json
        if data.get("solution") == "":
            return jsonify({"challenge": getChallenge(resource)}), 200
        solution = data["solution"]
        manifest = data["manifest"]
        if validateSolution(resource, solution):
            deletionSeq(resource, manifest, session.get("username"))
            return jsonify({}), 200
        else:
            return jsonify({}), 403
    else:
        return jsonify({}), 403


@application.route("/deleteAccount", methods=["POST"])
def deleteAccount():
    owner = session.get("username")
    if owner != None:
        data = request.json
        resources = data["resList"]
        accountDeleteSequence(owner, resources)
        return jsonify({}), 200
    else:
        return jsonify({}), 203

@application.route("/update",methods=['POST'])
def updateManifest():
    user = session.get("username")
    if user == None:
        return jsonify({}),403
    data = request.json["manifest"]
    writeToManifest(data, user)
    return jsonify({}),200

@application.route("/shares",methods=['POST'])
def createKeyShares():
    if session.get("username") != None:
        data = request.json
        key = data.get("key")
        if key != None:
            shares = createShares(key)
            return jsonify({"shares":shares}),200
        else:
            return jsonify({}),401
    else:
        return jsonify({}),403

@application.route("/serverShare",methods=['POST'])
def serverShares():
    if session.get("username") == None:
        return jsonify({}),403
    data = request.json
    share, challenge, resHash, username = data['share'],data['challenge'],data['resHash'], data['username']
    if userExists(username):
        storeSeverShares(username,share,challenge,resHash)
        return jsonify({}),200
    else:
        return jsonify(),401

@application.route("/clientShare",methods=['POST'])
def clientShares():
    owner = session.get("username")
    if owner == None:
        return jsonify({}),403
    data = request.json
    share, resource, name, size, un = data["share"],data["resource"],data["name"],data["size"],data["username"]
    storeClientShares(share,resource,name,size, un, owner)
    return jsonify({}),200 

@application.route("/sharing")
def lookupSharing():
    user = session.get("username")
    if user == None:
        return jsonify({}),403
    content = getUserSharing(user)
    return jsonify(content),200

@application.route("/combine",methods=['POST'])
def combine():
    username = session.get("username")
    if username == None:
        return jsonify({}),403
    data = request.json
    resHash = data["resHash"]
    if data.get("challenge") == "":
        challenge = getSharedChallenge(resHash,username)
        return jsonify({"challenge": challenge}),200
    solution = data.get("challenge")
    share = data.get("share")
    if verifySharedSolution(resHash,solution,username):
        key = combineShares(share,username,resHash)
        print(key)
        return jsonify({"key":key}),200
    else:
        return jsonify({}),403
    
@application.route("/revoke",methods=['POST'])
def revokeShared():
    user = session.get("username")
    if user == None:
        return jsonify({}),403
    data = request.json
    if data.get("resHash") != None and data.get("challenge") == "":
        challenge = getSharedChallenge(data.get("resHash"),user)
        return jsonify({"challenge": challenge}),200
    elif data.get("resHash") != None and data.get("challenge") != "" and data.get("share") != None:
        if verifySharedSolution(data["resHash"],data["challenge"],user):
            loseSharing(data["resHash"],user,data["share"])
            return jsonify({}),200
        else:
            return jsonify({}),403
    elif data.get("resHash") == None and data.get("challenge") == "":
        challenge = getChallenge(data.get("resource"))
        return jsonify({"challenge": challenge}),200
    elif data.get("resHash") != None and data.get("challenge") != "":
        if validateSolution(data.get("resource"),data.get("challenge")):
            revokeSharing(data["resource"],data["username"],data["resHash"])
            return jsonify({}),200
        else:
            return jsonify({}),403

if __name__ == "__main__":
    application.run(debug=True, host="0.0.0.0")
