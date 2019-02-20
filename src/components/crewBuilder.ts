import {CrewBuilderService} from "../services/crewBuilderService";
import { EventAggregator } from 'aurelia-event-aggregator';
import {autoinject,observable} from 'aurelia-framework';
import {FilterService} from "../services/filterService";
import {TrackingService} from "../services/trackingService";
import {DialogService} from "aurelia-dialog";
import {Confirm} from "../dialogs/confirm";
import {AppRouter} from "aurelia-router";
import * as localForage from 'localforage';
import {ShareCrew} from "../dialogs/shareCrew";

@autoinject()
export class CrewBuilder {
  private remaining;
  private crew;
  @observable()
  private crewName;
  private saveSuccess:boolean;
  private message: string = "";
  private messageType: string;
  private messageShow: string;

  constructor(private crewBuilderService: CrewBuilderService, private ea: EventAggregator, private filterService: FilterService, private dialogService:DialogService, private router:AppRouter) {
    const self = this;
    self.updateCrew();
    self.updateRemainingSoulStones();
    ea.subscribe("crewUpdate", () => {
      self.updateCrew();
      self.updateRemainingSoulStones();
    });
  }

  updateRemainingSoulStones() {
    this.remaining = this.crewBuilderService.getSoulStonesRemaining();
  }

  crewNameChanged(newValue, oldValue) {
    this.crewBuilderService.setCrewName(newValue);
  }

  updateCrew() {
    this.crew = this.crewBuilderService.getCrew();
    this.crewName = this.crew.saveName;
    this.filterService.filterChange();
  }

  save() {
    if (!this.crewBuilderService.hasChanges) {
      this.showMessage("No changes to save");
      return;
    }
    TrackingService.event('click', 'crewSave', this.crewBuilderService.getCrew().faction, null);
    this.crewBuilderService.saveCrew(this.crewName);
    this.saveSuccess = true;
    setTimeout(()=>{this.saveSuccess = false},10);
    this.showMessage("Crew has been saved!");
  }

  endCrewBuilder() {
    if (this.crewBuilderService.hasChanges) {
      this.dialogService.open({viewModel:Confirm, model: {
        text: "Discard changes?",
          ok: "Discard",
          no: "Cancel"
        }}).whenClosed(response => {
          if (!response.wasCancelled) {
            this.crewBuilderService.hideCrewList();
          }
      })
    } else {
      this.crewBuilderService.hideCrewList();
    }
  }

  showMessage(message:string) {
    this.messageType = "";
    this.setMessage(message);
  }

  showError(message:string) {
    this.messageType = "error";
    this.setMessage(message);
  }

  private setMessage(message: string) {
    if (this.messageShow) {
      const self = this;
      this.hideMessage(0);
      setTimeout(()=> {self.message = message; self.messageShow = "show"}, 300);
      setTimeout(()=> {self.hideMessage(3000)});
    } else {
      this.message = message;
      this.messageShow = "show";
      this.hideMessage(3000);
    }
  }

  private hideMessage(delay: number) {
    const self = this;
    setTimeout(()=> { self.messageShow = ""; }, delay);
  }

  printCrew() {
    localForage.setItem("printCrew", this.crewBuilderService.getCrew());
    this.router.navigate("print");
  }

  shareCrew() {
    this.dialogService.open({viewModel:ShareCrew, model: {
        crew: this.crewBuilderService.getCrew()
      }, lock: false});
  }
}
