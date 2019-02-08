import {bindable} from 'aurelia-framework'

export class ActionTable {
  @bindable()
  private actions;
  @bindable()
  private name;
  @bindable()
  private media:string = 'screen';
}
