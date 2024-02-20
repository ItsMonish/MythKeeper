from flask import Flask,render_template,Response
from configparser import ConfigParser

application = Flask(__name__)
global configParser

@application.route("/")
def serveLoginPage() -> Response:
    return render_template("home.html",name=config['General']['HostingName'])

@application.route("/signup")
def signUpResponse() -> Response:
    if config['Login']['AllowSignUps'] == "False":
        return "<p>It appears the administrator has turned off sign ups for this hosting.\
              Contact the admininstrator. If you have login credential <a href=\"/\">click here</a>."
    else:
        return render_template("signup.html",name=config['General']['HostingName'])

if __name__=="__main__":
    config = ConfigParser()
    config.read("./keeper.conf")
    application.run(debug=True,host="0.0.0.0")