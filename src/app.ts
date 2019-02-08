import {AppRouter, RouterConfiguration,
  NavigationInstruction,
  Next} from 'aurelia-router';
import {autoinject} from 'aurelia-framework';
import {PLATFORM} from 'aurelia-pal';
import {TrackingService} from "./services/trackingService";
import {MenuService} from "./services/menuService";

@autoinject
export class App {
  private current;

  constructor(private router: AppRouter, private menuService: MenuService){
    TrackingService.init();
    this.addStructuredData();
    this.initServiceWorker();
  }

  configureRouter(config: RouterConfiguration) {
    const self = this;
    const step = {
      run(navigationInstruction: NavigationInstruction, next: Next): Promise<any> {
        self.current = navigationInstruction.config.name;
        return next();
      }
    };
    config.addPostRenderStep(step);
    config.title = 'LiveTeam';
    config.map([
      { route: '', name: 'summary', moduleId: PLATFORM.moduleName('pages/summary'), nav: true,  title: "Malifaux3E Beta Analyzer - Summary"},
      { route: 'data', name: 'data', moduleId: PLATFORM.moduleName('pages/data'), nav: true,  title: "Malifaux3E Beta Analyzer - Data"},
      { route: 'print', name: 'print', moduleId: PLATFORM.moduleName('pages/print'), nav: true,  title: "Malifaux3E Beta Analyzer - Print"}
    ]);
  }

  navigateTo(dist) {
    this.router.navigateToRoute(dist);
    this.current = dist;
  }

  menuSwipe($event) {
    if ($event.direction === 'left') {
      this.menuService.swipeLeft();
    } else if ($event.direction === 'right') {
      this.menuService.swipeRight();
    }
  }

  addStructuredData() {
    const data = {
      "@context":"https://schema.org/",
      "@type":"Dataset",
      "name":"Malifaux3E Beta Analyzer",
      "description": "A tool for getting a better overview of the new models of 3rd edition Malifaux",
      "url": "https://m3e.hong-crewet.dk",
      "keywords": [
        "Malifaux", "M3E", "Beta", "Analyzer"
      ],
      "creator": {
        "@type":"Organization",
        "url": "https://www.hong-crewet.dk",
        "name": "Høng-Crewet"
      }
    };
    const structuredDataScript = document.createElement('script');
    structuredDataScript.type = "application/ld+json";
    structuredDataScript.text = JSON.stringify(data);
    document.querySelector('body').appendChild(structuredDataScript);
  }

  initServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
          console.log('SW registered: ', registration);
        }).catch(registrationError => {
          console.log('SW registration failed: ', registrationError);
        });
      });
    }
  }
}
