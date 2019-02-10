import * as localForage from 'localforage';

export class ShownService {
  private shown;

  constructor() {
    this.loadShown();
  }

  public setShown(type:string, id:string, shown:boolean):void {
    if(!this.shown[type]) {
      this.shown[type] = {};
    }
    this.shown[type][id] = shown;
    this.saveShown();
  }

  public getShown(type:string, id:string):boolean {
    return this.shown && this.shown[type] && !!this.shown[type][id];
  }

  private loadShown():void {
    localForage.getItem("shownCache").then( shown => {
      if (shown) {
        this.shown = shown;
      } else {
        this.shown = {};
      }
    });
  }

  private saveShown():void {
    localForage.setItem("shownCache", this.shown);
  }

}
