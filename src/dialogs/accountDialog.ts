import {autoinject} from 'aurelia-framework';
import {FirebaseService} from "../services/FirebaseService";
import {DialogController} from "aurelia-dialog";

@autoinject()
export class AccountDialog {
  headline:string = "Sign in";

  constructor(private firebaseService: FirebaseService, private controller: DialogController){}

  activate(texts) {
    if (texts) {
      this.headline = texts.headline || this.headline;
    }
  }

  attached() {
    this.firebaseService.signIn("signIn");
  }

  cancel() {
    this.controller.cancel();
  }
}
