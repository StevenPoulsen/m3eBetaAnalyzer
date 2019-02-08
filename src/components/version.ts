import {FilterService} from "../services/filterService";
import {autoinject} from 'aurelia-framework';
import {DataService} from "../services/dataService";
import {CrewBuilderService} from "../services/crewBuilderService";
import {TrackingService} from "../services/trackingService";
import {DialogService} from "aurelia-dialog";
import {Confirm} from "../dialogs/confirm";

@autoinject()
export class Version {
  private currentVersion;
  private nextVersion;

  constructor(private filterService:FilterService, private dataService: DataService, private crewBuilder: CrewBuilderService, private dialogService: DialogService){
    this.nextVersion = dataService.currentVersion;
    this.currentVersion = this.nextVersion;
  }

  filterChange() {
    if (!this.nextVersion || (this.crewBuilder.hasChanges)) {
      this.dialogService.open({
        viewModel:Confirm,model:{
          text: "You will lose your crew changes if you change version. Proceed?",
          ok: "Proceed",
          no: "Cancel"
        }
      }).whenClosed(response => {
        if (response.wasCancelled) {
          this.nextVersion = this.currentVersion;
        } else {
          this.changeVersion();
        }
      });
    } else {
      this.changeVersion();
    }
  }

  private changeVersion() {
    TrackingService.event('versionChange', 'versionChange', this.nextVersion, null);
    this.currentVersion = this.nextVersion;
    this.dataService.currentVersion = this.nextVersion;
    this.filterService.filterChange();
    this.crewBuilder.hideCrewList();
  }
}
