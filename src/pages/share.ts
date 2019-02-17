import {autoinject} from "aurelia-framework";
import {AppRouter} from 'aurelia-router';
import {DataService} from "../services/dataService";
import {CrewBuilderService} from "../services/crewBuilderService";
import {TrackingService} from "../services/trackingService";

@autoinject()
export class Share {

  constructor(private dataService: DataService, private crewBuilderService: CrewBuilderService, private router: AppRouter) {}

  activate(params) {
    if (params && params.f) {
      TrackingService.event('viewShare', 'share', params.f, null);
      this.readSharedCrew(params);
    } else {
      this.goToSummary();
    }
  }

  private readSharedCrew(sharedCrew) {
    this.crewBuilderService.setCrewFromShare(sharedCrew).then(()=>{
      console.log("read share", sharedCrew, this.crewBuilderService.getCrew());
      this.goToSummary();
    });
  }

  goToSummary() {
    this.router.navigateToRoute("summary");
  }

}
