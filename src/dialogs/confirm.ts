import {autoinject} from 'aurelia-framework';
import {DialogController} from "aurelia-dialog";
import {useView} from 'aurelia-framework';

@autoinject()
@useView('./confirm.html')
export class Confirm {
  private texts = {};

  constructor(private controller: DialogController){}

  activate(texts) {
    this.texts = texts;
  }

}
