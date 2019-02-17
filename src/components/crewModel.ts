import {bindable,autoinject} from 'aurelia-framework';
import {CrewBuilderService} from "../services/crewBuilderService";
import {DialogService} from "aurelia-dialog";
import {EditModel} from "../dialogs/editModel";

@autoinject()
export class CrewModel {
  @bindable()
  private model;
  private crew;

  constructor(private crewBuilderService:CrewBuilderService, private dialogService:DialogService) {}

  bind() {
    this.crew = this.crewBuilderService.getCrew();
  }

  removeModel() {
    this.crewBuilderService.removeModel(this.model.id);
  }

  removeUpgrade() {
    this.crewBuilderService.removeCrewModelUpgrade(this.model);
  }

  editCrewModel() {
    this.dialogService.open({viewModel:EditModel, model: this.model}).whenClosed(response => {
      if (!response.wasCancelled) {

      }
    })
  }

}
