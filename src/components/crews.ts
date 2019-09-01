import {CrewBuilderService} from "../services/crewBuilderService";
import {autoinject} from 'aurelia-framework';
import { EventAggregator } from 'aurelia-event-aggregator';
import {FilterService} from "../services/filterService";
import {DialogService} from "aurelia-dialog";
import {Confirm} from "../dialogs/confirm";
import {MenuService} from "../services/menuService";
import {FactionPrompt} from "../dialogs/factionPrompt";
import {DataService} from "../services/dataService";
import {FirebaseService} from "../services/FirebaseService";

@autoinject()
export class Crews {
  private crews:any[] = [];

  constructor(
    private crewBuilderService: CrewBuilderService,
    private dataService: DataService,
    private ea: EventAggregator,
    private filterService: FilterService,
    private dialogService:DialogService,
    private menuService: MenuService,
    private firebaseService: FirebaseService) {
    ea.subscribe("crewSave", () => {
      this.crewBuilderService.getCrews().then( crews => {
        this.setCrews(crews);
      });
    });
    ea.subscribe("versionChange", () => {
      this.crewBuilderService.getCrews().then(crews => {
        this.setCrews(crews);
      });
    });
    ea.subscribe("userDataLoaded", userData => {
      this.crewBuilderService.getCrews(true).then( crews => {
        this.setCrews(crews);
      });
    });
    this.crewBuilderService.getCrews().then(crews => {
      this.setCrews(crews);
    });
  }

  loadCrew(crewName: string) {
    if (this.crewBuilderService.hasChanges) {
      this.dialogService.open({viewModel:Confirm, model: {
        text: "You will lose your crew changes if you load another crew. Proceed?",
          ok: "Proceed",
          no: "Cancel"
        }}).whenClosed(response => {
          if (!response.wasCancelled) {
            this.setCrewFromName(crewName);
            this.menuService.showRightMenu();
          }
      })
    } else {
      this.setCrewFromName(crewName);
      this.menuService.showRightMenu();
    }
  }

  private setCrewFromName(crewName:string) {
    this.crewBuilderService.loadCrew(crewName);
    this.filterService.setCrewLegalOnly(true);
    this.filterService.filterChange();
  }

  deleteCrew(crewName: string) {
    this.dialogService.open({viewModel:Confirm, model: {
      text: "Delete " + crewName + "?",
        ok: "Delete",
        no: "Cancel"
      }}).whenClosed(response => {
        if (!response.wasCancelled) {
          this.crewBuilderService.deleteCrew(crewName).then(crews => {
            this.crews = crews;
            this.filterService.loadValues("preCrewBuilder").then((values)=>{
              if (values) {
                this.filterService.updateWithValues(values);
              }
              this.filterService.filterChange();
            })
          });
        }
    });
  }

  createCrew() {
    if (!this.crewBuilderService.isBuilding) {
      this.filterService.saveValues("preCrewBuilder", this.filterService.getCurrentValues());
    }
    window.scrollTo(0,0);
    this.dialogService.open({viewModel:FactionPrompt, model: {
        factions:this.dataService.getSelectableFactionKeys(),
        skipable: true
      }, lock: false}).whenClosed(response => {
        if (!response.wasCancelled) {
          const faction = response.output;
          this.menuService.showRightMenu();
          const filterValues = this.filterService.getResetValues();
          filterValues.crewLegalOnly = true;
          filterValues.options.quickShow = ["cost"];
          filterValues.options.sort.modelSorts = ["tax","wyrd"];
          filterValues.options.modelGroupBy = "type";
          this.filterService.updateWithValues(filterValues);
          this.crewBuilderService.newCrew(this.dataService.getFactionDisplayName(faction));
        }
    });
  }

  setCrews(crews:any[]){
    if (!crews) {
      return;
    }
    if (!this.crews) {
      if (crews) {
        this.crews = crews;
        this.crewBuilderService.saveCrews(this.crews, false);
      }
    } else {
      const newCrews = [];
      let updated:boolean = false;
      for (const newCrew of crews) {
        let isNew = true;
        for (let oldCrew of this.crews) {
          if (oldCrew.saveName === newCrew.saveName) {
            isNew = false;
            if (newCrew.lastSave && oldCrew.lastSave > newCrew.lastSave) {
              oldCrew = newCrew;
              updated = true;
            }
            break;
          }
        }
        if (isNew) {
          updated = true;
          newCrews.push(newCrew);
        }
      }
      if (newCrews) {
        this.crews = this.crews.concat(newCrews);
      }
      if (updated) {
        this.crewBuilderService.saveCrews(this.crews, false);
      }
    }
  }

}
