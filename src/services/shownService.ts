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
    return this.shown[type] && !!this.shown[type][id];
  }

  private loadShown():void {
    const cacheString = localStorage.getItem("shownCache");
    if (cacheString) {
      this.shown = JSON.parse(cacheString);
    } else {
      this.shown = {};
    }
  }

  private saveShown():void {
    localStorage.setItem("shownCache", JSON.stringify(this.shown));
  }

}
