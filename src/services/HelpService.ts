import {autoinject} from 'aurelia-framework';
import {DialogService} from "aurelia-dialog";
import {Help} from "../dialogs/help";

@autoinject()
export class HelpService {
  private helpTexts;

  constructor(private dialogService: DialogService) {
    this.initHelp();
  }

  showHelp(help:string){
    if (help && this.helpTexts[help]) {
      this.dialogService.open({viewModel:Help, model:this.helpTexts[help], lock:false});
    }
  }

  initHelp() {
    this.helpTexts = {
      "setups": {headline:"Setups", texts:["Use the Setups section to store your most used Filter/List Options setups for later reuse."]},
      "account": {headline:"Account", texts:["If you are signed in, your Setups, Crews and Owned/Painted/Favourites can be saved to the cloud.","This will allow you to reuse the mentioned elements across devices.", "Opening or refreshing the page will pull your latest save from the cloud automatically."]},
      "install": {headline:"Install", texts:["Install this page on your phone to access it like an app instead of having to remember or bookmark it"]}
    }
  }
}
