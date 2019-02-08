import { EventAggregator } from 'aurelia-event-aggregator';
import {autoinject} from 'aurelia-framework'

@autoinject()
export class MenuService {
  private leftMenuShown;
  private rightMenuShown;
  private hasLeftMenu;
  private hasRightMenu;

  constructor(private ea: EventAggregator){}

  public swipeLeft() {
    if (this.leftMenuShown) {
      this.hideLeftMenu();
    } else {
      this.showRightMenu();
    }
  }

  public swipeRight() {
    if (this.rightMenuShown) {
      this.hideRightMenu();
    } else {
      this.showLeftMenu();
    }
  }

  public showLeftMenu() {
    if (this.rightMenuShown) {
      this.hideRightMenu();
    }
    if (this.hasLeftMenu) {
      this.leftMenuShown = true;
      this.ea.publish("leftMenuShow");
    }
  }

  public hideLeftMenu() {
    this.leftMenuShown = false;
    this.ea.publish("leftMenuHide");
  }

  public showRightMenu() {
    if (this.leftMenuShown) {
      this.hideLeftMenu();
    }
    if (this.hasRightMenu) {
      this.rightMenuShown = true;
      this.ea.publish("rightMenuShow");
    }
  }

  public hideRightMenu() {
    this.rightMenuShown = false;
    this.ea.publish("rightMenuHide");
  }

  public toggleLeftMenu() {
    if (this.leftMenuShown) {
      this.hideLeftMenu();
    } else {
      this.showLeftMenu();
    }
  }

  public toggleRightMenu() {
    if (this.rightMenuShown) {
      this.hideRightMenu();
    } else {
      this.showRightMenu();
    }
  }

  public activeLeftMenu() {
    this.hasLeftMenu = true;
  }

  public activateRightMenu() {
    this.hasRightMenu = true;
  }

  public deactivateRightMenu() {
    this.hasRightMenu = false;
  }

  public isLeftMenuShown():boolean {
    return !!this.leftMenuShown;
  }

  public isRightMenuShown():boolean {
    return !!this.rightMenuShown;
  }
}
