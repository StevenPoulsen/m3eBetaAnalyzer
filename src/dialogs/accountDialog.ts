import {autoinject} from 'aurelia-framework';
import {FirebaseService} from "../services/FirebaseService";

@autoinject()
export class AccountDialog {

  constructor(private firebaseService: FirebaseService){}

  attached() {
    this.firebaseService.signIn("signIn");
  }
}
