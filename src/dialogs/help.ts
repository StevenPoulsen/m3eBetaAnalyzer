import {autoinject} from 'aurelia-framework';
import {DialogController} from "aurelia-dialog";

@autoinject()
export class Help {
  headline:string;
  texts:string[];

  constructor(private controller:DialogController){}

  activate(data) {
    if (data) {
      this.headline= data.headline;
      this.texts = data.texts;
    }
  }

  close() {
    this.controller.cancel();
  }
}
