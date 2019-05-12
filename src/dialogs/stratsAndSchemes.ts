import {DataService} from "../services/dataService";
import {autoinject} from "aurelia-framework";
import {TrackingService} from "../services/trackingService";

@autoinject()
export class StratsAndSchemes {

  private chosen:boolean = false;
  private chosenSchemes: any[] = [];
  private chosenStrategy: any = null;
  private schemes:any[] = [];
  private strats:any[] = [];
  private error:string = "";

  constructor(private dataService:DataService){}

  activate() {
    this.loadCache();
    this.dataService.getStratsAndSchemes().then(response => {
      if (response) {
        this.schemes = response.schemes;
        this.strats = response.strats;
        this.sortSchemes(this.schemes);
      }
    });
  }

  selectRandom() {
    if (!this.chosenStrategy) {
      this.chosenStrategy = this.strats[Math.floor(Math.random() * this.strats.length)];
    }

    const availableSchemes = this.schemes.slice(0);
    while (this.chosenSchemes.length < 5) {
      this.chosenSchemes.push(availableSchemes.splice(Math.floor(Math.random() * availableSchemes.length), 1)[0]);
    }
    this.sortSchemes(this.chosenSchemes);
    this.chosen = true;
    this.setCache();
    TrackingService.event('click', "stratsAndSchemes", "selectRandom", null);
  }

  continue() {
    if (this.chosenStrategy && this.chosenSchemes.length === 5) {
      this.sortSchemes(this.chosenSchemes);
      this.chosen = true;
      this.setCache();
      TrackingService.event('click', "stratsAndSchemes", "selectManual", null);
    } else {
      this.error = "Select exactly 1 Strategy and 5 Schemes";
    }
  }

  reset() {
    this.chosen = false;
    this.chosenSchemes = [];
    this.chosenStrategy = null;
    localStorage.removeItem("s&s");
    TrackingService.event('click', "stratsAndSchemes", "reset", null);
  }

  setCache() {
    const cache = {
      chosen: this.chosen,
      schemes: this.chosenSchemes,
      strat: this.chosenStrategy
    };
    localStorage.setItem("s&s", JSON.stringify(cache));
  }

  loadCache() {
    const cacheString = localStorage.getItem("s&s");
    if (cacheString) {
      const cache = JSON.parse(cacheString);
      this.chosenStrategy = cache.strat;
      this.chosenSchemes = cache.schemes;
      this.chosen = cache.chosen;
    }
  }

  public addScheme(scheme:any):void {
    if (!this.chosenSchemes) {
      this.chosenSchemes = [];
    }
    this.chosenSchemes.push(scheme);
  }

  public removeScheme(scheme:any):void {
    if (!scheme || !this.chosenSchemes || !this.chosenSchemes.length) {
      return;
    }
    for (let i = 0, len = this.chosenSchemes.length; i < len; i++) {
      if (this.chosenSchemes[i].name === scheme.name) {
        this.chosenSchemes.splice(i, 1);
        i--;
      }
    }
  }

  public setStrategy(strategy:any):void {
    this.chosenStrategy = strategy;
  }

  public removeStrategy():void {
    this.chosenStrategy = null;
  }

  private sortSchemes(schemes:any[]): void {
    if (!schemes) {
      return;
    }
    schemes.sort((a:any,b:any):number => {
      return a.number - b.number;
    })
  }
}
