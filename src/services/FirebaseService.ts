import * as firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';
import * as firebaseui from 'firebaseui';
import * as localForage from 'localforage';
import {EventAggregator} from 'aurelia-event-aggregator';
import {autoinject} from 'aurelia-framework';
import {TrackingService} from "./trackingService";

@autoinject()
export class FirebaseService {
  private firebase;
  private ui;
  private user;
  private uiConfig;
  private db;
  private userData = {};

  constructor(private ea: EventAggregator) {
    localForage.getItem("user").then(user=> {
      if (user) {
        this.user = user;
      }
    });

    this.init();
  }

  init():void {
    const config = {
      apiKey: "AIzaSyBdlK6fYS6owtxD4ybG8zUyagdAogwxvm4",
      authDomain: "malifaux3e-beta-analyzer.firebaseapp.com",
      databaseURL: "https://malifaux3e-beta-analyzer.firebaseio.com",
      projectId: "malifaux3e-beta-analyzer",
      storageBucket: "malifaux3e-beta-analyzer.appspot.com",
      messagingSenderId: "6836431495"
    };
    this.firebase = firebase.initializeApp(config);
    const self = this;
    this.uiConfig = {
      callbacks: {
        signInSuccessWithAuthResult: function (authResult, redirectUrl) {
          self.user = authResult.user;
          return false;
        },
        signInFailure: function (error) {
          return (error) => {
            console.log(error)
          };
        },
        uiShown: function () {
        }
      },
      signInSuccessUrl: window.location.href,
      signInOptions: [
        firebase.auth.GoogleAuthProvider.PROVIDER_ID,
        firebase.auth.FacebookAuthProvider.PROVIDER_ID,
        firebase.auth.EmailAuthProvider.PROVIDER_ID
      ],
      // tosUrl and privacyPolicyUrl accept either url string or a callback function.
      // Terms of service url/callback.
      tosUrl: 'https://m3e.hong-crewet.dk/privacy_and_terms.html',
      // Privacy policy url/callback.
      privacyPolicyUrl: function() {
        window.location.assign('https://m3e.hong-crewet.dk/privacy_and_terms.html');
      }
    };

    // Initialize the FirebaseUI Widget using Firebase.
    this.ui = new firebaseui.auth.AuthUI(firebase.auth());

    firebase.auth().onAuthStateChanged(function(user) {
      self.user = user;
      self.ea.publish("loginUpdate");
    });
  }

  signIn(domTargetId):void {
    // The start method will wait until the DOM is loaded.
    this.ui.start('#'+domTargetId, this.uiConfig);
  }

  signOut():Promise<boolean> {
    return firebase.auth().signOut().then(()=>{
      this.user = null;
      return true;
    });
  }

  isSignedIn():boolean {
    if (!this.user) {
      this.user = firebase.auth().currentUser;
    }
    return !!this.user;
  }

  isPendingRedirect() {
    return this.ui.isPendingRedirect();
  }

  getUserDisplayName():string {
    if (this.user) {
      return this.user.displayName;
    }
    return "";
  }

  storeUserData(key:string, obj:any) {
    if (!this.user) {
      return;
    }
    this.userData[key] = obj;
    this.ea.publish("userDataChanged");
  }

  getUserData(key:string):any {
    if (!this.user) {
      return null;
    }
    return this.userData[key];
  }

  saveToCloud():void {
    if (!this.user) {
      return;
    }
    this.storeData("userData", this.user.uid, this.userData);

    TrackingService.event('click', 'saveToCloud', null, null);
  }

  loadFromCloud():void {
    if (!this.user) {
      return;
    }
    this.getData("userData", this.user.uid).then(userData => {
      this.userData = userData;
      this.ea.publish("userDataLoaded", this.userData);
    }).catch(()=>{
      console.log("No user doc");
    });
  }

  storeData(key:string, subKey:string, obj:any):void {
    if (!this.db) {
      this.db = firebase.firestore();
    }
    let item = Array.isArray(obj) ? {arr:this.removeEmpty(obj),type:"arr"} : this.removeEmpty(obj);
    this.db.collection(key).doc(subKey).set(item)
      .then(function() {
        console.log("Document successfully written!");
      })
      .catch(function(error) {
        console.error("Error writing document: ", error);
      });
  }

  getData(key:string, subKey:string):Promise<any> {
    if (!this.db) {
      this.db = firebase.firestore();
    }
    return this.db.collection(key).doc(subKey).get().then(doc => {
      if (doc.exists) {
        return new Promise(resolve => {
          const item = doc.data();
          if (item && item.type === "arr") {
            resolve(item.arr);
          } else {
            resolve(item);
          }
        });
      }else {
        throw new Error("no doc");
      }
    });
  }

  private removeEmpty(obj:any) {
    Object.keys(obj).forEach(key => {
      if (obj[key] && typeof obj[key] === 'object') this.removeEmpty(obj[key]);
      else if (obj[key] === undefined) delete obj[key];
    });
    return obj;
  }
}
