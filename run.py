from flask import Flask,render_template,Response,request,url_for,session,redirect, jsonify
from configparser import ConfigParser
from config import configs
from datetime import timedelta
from app.auth.login import authLogin
from app.auth.signup import createUser

application = Flask(__name__)
application.secret_key = configs.SECRET_KEY
application.permanent_session_lifetime = timedelta(minutes=30)
global configParser

@application.route("/")
def serveLoginPage() -> Response:
    return render_template("home.html",name=config['General']['HostingName'])

@application.route("/login",methods=['POST'])
def authenticateLogin():
    data = request.json
    userName,password = data['username'],data['password']
    if session.get('username') != None:
        return url_for('serveDashboard',user=userName)
    if authLogin(userName,password):
        session['username'] = userName
        session.permanent = True
        return url_for('serveDashboard',user=userName)
    else:
        return url_for('loginError')
    
@application.route("/error")
def loginError():
    return render_template("home.html",name=config['General']['HostingName'],error="Login Failed")
    
@application.route("/<string:user>")
def serveDashboard(user):
    if session.get('username') == user:
        return render_template('dashboard.html')
    else:
        return redirect(url_for('loginError'))
    
@application.route("/logout")
def logOutUser():
    if session.get('username') != None:
        session.pop('username')
    return "<script>window.location.href='/'</script>"

@application.route("/signup")
def signUpResponse() -> Response:
    if config['Login']['AllowSignUps'] == "False":
        return "<p>It appears the administrator has turned off sign ups for this hosting.\
              Contact the admininstrator. If you have login credential <a href=\"/\">click here</a>."
    else:
        return render_template("signup.html",name=config['General']['HostingName'])
    
@application.route("/dashboard")
def testDash():
    return render_template('dashboard.html')

@application.route("/createUser", methods=['POST'])
def userCreation():
    if config['Login']['AllowSignUps'] == "False":
        return jsonify(status="failed")
    else:
        data = request.json
        resp = createUser(data['username'],data['password'])
        if resp['status'] == 'ok':
            session['username'] = data['username'] 
        return jsonify(resp)

if __name__=="__main__":
    config = ConfigParser()
    config.read("./keeper.conf")
    application.run(debug=True,host="0.0.0.0")