import {autoinject} from 'aurelia-framework';
import {FirebaseService} from "../services/FirebaseService";
import {AccountDialog} from "../dialogs/accountDialog";
import {DialogService} from "aurelia-dialog";
import {EventAggregator} from 'aurelia-event-aggregator';
import {HelpService} from "../services/HelpService";

@autoinject()
export class Account {
  private signedIn:number = 0;
  private userName: string;
  private canSave: boolean;

  constructor(private firebaseService: FirebaseService,
              private dialogService: DialogService,
              private ea: EventAggregator,
              private helpService: HelpService){
    ea.subscribe("loginUpdate", ()=>{
      this.checkSignedIn();
      if (this.signedIn === 1) {
        this.loadFromCloud();
      }
    });
    ea.subscribe("userDataChanged", () => {
      this.canSave = true;
    })
  }

  attached() {
    if (this.firebaseService.isPendingRedirect()) {
      this.firebaseService.signIn("secretSignIn");
    }
  }

  signIn() {
    this.dialogService.open({viewModel:AccountDialog, model:{}, lock:false}).whenClosed(()=>{
      this.checkSignedIn();
    });
  }

  signOut() {
    this.firebaseService.signOut().then(()=> {
      this.checkSignedIn();
    });
  }

  checkSignedIn() {
    this.signedIn = this.firebaseService.isSignedIn() ? 1 : -1;
    this.userName = this.firebaseService.getUserDisplayName();
  }

  saveToCloud() {
    this.canSave = false;
    this.firebaseService.saveToCloud();
  }

  loadFromCloud() {
    this.firebaseService.loadFromCloud();
  }
}
