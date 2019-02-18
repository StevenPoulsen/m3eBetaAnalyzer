export class TrackingService {
  static initialized:boolean = false;
  static currentPath:string = "";

  public static init() {
    //<!-- Global site tag (gtag.js) - Google Analytics -->
    if (location.hostname !== 'm3e.hong-crewet.dk') {
      console.log("Not tracking. Hostname was wrong: ", location.hostname);
      return;
    }

    const tagScript = document.createElement('script');
    tagScript.src = "https://www.googletagmanager.com/gtag/js?id=UA-10664853-3";
    document.querySelector('body').appendChild(tagScript);

    window["dataLayer"] = window["dataLayer"] || [];
    TrackingService.initialized = true;
    TrackingService.gtag('js', new Date());
  }

  private static gtag(...args: any[]) {
    if (TrackingService.initialized) {
      window["dataLayer"].push(arguments);
    } else {
      console.log("Not tracking event: ", JSON.stringify(args));
    }
  }

  public static page(path:string) {
    if (path && path !== TrackingService.currentPath) {
      TrackingService.currentPath = path;
      TrackingService.gtag('config', 'UA-10664853-3', {'page_path': path});
    }
  }

  public static event(action:string, category:string, label:string, value:number) {
    const event = {};
    if (category) {
      event['event_category'] = category;
    }
    if (label) {
      event['event_label'] = label;
    }
    if (value) {
      event['value'] = value;
    }
    TrackingService.gtag('event', action, event);
  }

}
