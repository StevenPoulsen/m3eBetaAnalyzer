import {CrewBuilderService} from "../services/crewBuilderService";
import {autoinject} from 'aurelia-framework';
import { EventAggregator } from 'aurelia-event-aggregator';
import {FilterService} from "../services/filterService";
import {DialogService} from "aurelia-dialog";
import {Confirm} from "../dialogs/confirm";
import {MenuService} from "../services/menuService";
import {FactionPrompt} from "../dialogs/factionPrompt";
import {DataService} from "../services/dataService";

@autoinject()
export class Crews {
  private crews = [];

  constructor(
    private crewBuilderService: CrewBuilderService,
    private dataService: DataService,
    private ea: EventAggregator,
    private filterService: FilterService,
    private dialogService:DialogService,
    private menuService: MenuService) {
    ea.subscribe("crewSave", () => {
      this.crewBuilderService.getCrews().then(crews => {
        this.crews = crews;
      });
    });
    ea.subscribe("versionChange", () => {
      this.crewBuilderService.getCrews().then(crews => {
        this.crews = crews;
      });
    })
    this.crewBuilderService.getCrews().then(crews => {
      this.crews = crews;
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
            this.filterService.filterChange();
          });
        }
    });
  }

  createCrew() {
    this.dialogService.open({viewModel:FactionPrompt, model: {
        factions:this.dataService.getSelectableFactionKeys(),
        skipable: true
      }, lock: false}).whenClosed(response => {
        let faction = null;
        if (!response.wasCancelled) {
          faction = response.output;
        }
      this.menuService.showRightMenu();
      const filterValues = this.filterService.getResetValues();
      filterValues.crewLegalOnly = true;
      filterValues.options.quickShow.push("cost");
      filterValues.options.sort.modelSorts = ["tax","wyrd"];
      filterValues.options.modelGroupBy = "type";
      this.filterService.updateWithValues(filterValues);
      this.crewBuilderService.newCrew(this.dataService.getFactionDisplayName(faction));
    });
  }

}
