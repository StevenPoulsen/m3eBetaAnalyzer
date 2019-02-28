import {TrackingService} from "../services/trackingService";
import {HelpService} from "../services/HelpService";
import {autoinject} from 'aurelia-framework';

@autoinject()
export class Install {
  private deferredPrompt;
  private show = false;

  constructor(private helpService:HelpService) {
    window.addEventListener("beforeinstallprompt", (e) => {
       e.preventDefault();
       this.deferredPrompt = e;
       this.show = true;
    });
  }

  install() {
    this.show = false;
    this.deferredPrompt.prompt();
    this.deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        TrackingService.event("installClick", "Install", null, 1);
      } else {
        TrackingService.event("installClick", "Install", null, 0);
      }
      this.deferredPrompt = null;
    })
  }
}
