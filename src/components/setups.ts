import {FirebaseService} from "../services/FirebaseService";
import * as localForage from 'localforage';
import {autoinject,observable} from "aurelia-framework";
import {EventAggregator} from 'aurelia-event-aggregator';
import {FilterService} from "../services/filterService";
import {HelpService} from "../services/HelpService";
import {TrackingService} from "../services/trackingService";

@autoinject()
export class Setups {
  storedValueSetups:any = {};
  storedValueSetupNames:string[] = [];
  @observable()
  valueSetupName: string = "";
  invalidSetupName: boolean = false;

  constructor(private filterService: FilterService, private firebaseService: FirebaseService, private ea: EventAggregator, private helpService: HelpService) {
    ea.subscribe("userDataLoaded", userData => {
      const setups = userData.setups;
      if (!setups) {
        return;
      }
      if (!this.storedValueSetups) {
        this.storedValueSetups = setups;
      } else {
        let newest = null, newNames = [];
        for (const s of Reflect.ownKeys(setups)) {
          const setup = setups[s];
          newNames.push(s);
          let isNew = true;
          if (newest === null || setup.saveTime > newest) {
            newest = setup.saveTime;
          }
          for (const o of Reflect.ownKeys(this.storedValueSetups)) {
            const oldSetup = this.storedValueSetups[o];
            if (oldSetup.name === setup.name) {
              isNew = false;
              if (oldSetup.saveTime < setup.saveTime) {
                this.storedValueSetups[o] = setup;
                break;
              }
            }
          }
          if (isNew) {
            this.storedValueSetups[s] = setup;
          }
        }
        for (const o of Reflect.ownKeys(this.storedValueSetups)) {
          if (newNames.includes(o)) {
            continue;
          }
          const oldSetup = this.storedValueSetups[o];
          if (oldSetup.saveTime < newest) {
            delete this.storedValueSetups[o];
          }
        }
      }
      this.storedValueSetupNames = Object.keys(this.storedValueSetups);
    });
  }

  bind() {
    localForage.getItem("setups").then(setups => {
      if (setups) {
        this.storedValueSetups = setups;
        this.storedValueSetupNames = Object.keys(this.storedValueSetups);
      }
    })
  }

  valueSetupNameChanged(newValue, oldValue) {
    if (this.invalidSetupName && newValue && newValue !== oldValue) {
      this.invalidSetupName = false;
    }
  }

  private saveValueSetup() {
    if (!this.valueSetupName) {
      this.invalidSetupName = true;
      return;
    }
    const currentValues = this.filterService.getCurrentValues();
    currentValues.saveTime = new Date().getTime();
    this.storedValueSetups[this.valueSetupName] = currentValues;
    localForage.setItem("setups", this.storedValueSetups);
    if (this.firebaseService.isSignedIn()) {
      this.firebaseService.storeUserData("setups", this.storedValueSetups);
    }
    this.storedValueSetupNames = Object.keys(this.storedValueSetups);

    TrackingService.event('click', 'setupSave', null, null);
  }

  private loadValueSetup(name: string) {
    if (!name) {
      return;
    }
    if (this.storedValueSetups[name]) {
      this.filterService.updateWithValues(this.storedValueSetups[name]);
      this.valueSetupName = name;
      this.filterService.filterChange();
    }
  }

  private deleteValueSetup(name: string) {
    if (!name) {
      return;
    }
    delete this.storedValueSetups[name];
    this.storedValueSetupNames = Object.keys(this.storedValueSetups);
  }
}
