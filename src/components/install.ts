import {TrackingService} from "../services/trackingService";

export class Install {
  private deferredPrompt;
  private show = false;

  constructor() {
    window.addEventListener("beforeinstallprompt", (e) => {
       e.preventDefault();
       console.log("beforeinstallprompt");
       this.deferredPrompt = e;
       this.show = true;
    });
  }

  install() {
    this.show = false;
    this.deferredPrompt.prompt();
    this.deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log("User accepted the A2HS prompt");
        TrackingService.event("installClick", "Install", null, 1);
      } else {
        console.log("User declined the A2HS prompt");
        TrackingService.event("installClick", "Install", null, 0);
      }
      this.deferredPrompt = null;
    })
  }
}
