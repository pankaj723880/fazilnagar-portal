import { describe, it } from "node:test";
import assert from "node:assert/strict";
import SiteSettings from "../models/SiteSettings.js";
import PublicService from "../models/PublicService.js";
import Event from "../models/Event.js";
import HeritageSite from "../models/HeritageSite.js";
import AuditLog from "../models/AuditLog.js";
import MediaItem from "../models/MediaItem.js";

describe("CMS Models & Dynamic Schemas Verification", () => {
  it("SiteSettings initializes with complete default structure", () => {
    const settings = new SiteSettings();
    assert.equal(settings.key, "primary_settings");
    assert.ok(settings.siteName.includes("Fazilnagar"));
    assert.ok(settings.announcement.enabled);
    assert.ok(settings.contact.officialPhone);
    assert.ok(settings.sections.interactiveMap);
    assert.ok(settings.sections.heroCarousel);

    // Verify Homepage CMS Schemas
    assert.ok(settings.topAlertBar.enabled);
    assert.equal(settings.topAlertBar.badgeText, "LIVE CIVIC");
    assert.equal(settings.navigation.brandFirst, "FAZIL");
    assert.equal(settings.navigation.brandSecond, "NAGAR");
    assert.ok(Array.isArray(settings.navigation.navItems));
    assert.ok(settings.navigation.navItems.length >= 5);
    assert.ok(Array.isArray(settings.heroContent.trustBadges));
    assert.ok(settings.heroContent.trustBadges.length >= 3);
    assert.ok(Array.isArray(settings.heroContent.actionButtons));
    assert.ok(settings.heroContent.actionButtons.length >= 5);
    assert.equal(settings.homepageSections.explore.title, "Explore Fazilnagar");
    assert.ok(Array.isArray(settings.homepageSections.publicServices.cards));
    assert.ok(settings.homepageSections.publicServices.cards.length >= 4);
    assert.equal(settings.homepageSections.map.title, "Explore Fazilnagar on Map");
    assert.equal(settings.homepageSections.events.title, "Upcoming Events & Town Melas");
    assert.ok(settings.homepageSections.heritage.title.includes("Twin Heritage"));
    assert.ok(settings.footer.copyrightText.includes("Fazilnagar"));
  });

  it("PublicService validates category and required fields", () => {
    const service = new PublicService({
      title: "Ration Card Application",
      category: "Aadhaar & Ration Card",
      description: "Application for new NFSA ration card in Fazilnagar.",
    });
    assert.equal(service.title, "Ration Card Application");
    assert.equal(service.category, "Aadhaar & Ration Card");
    assert.equal(service.isPublished, true);
  });

  it("Event validates category, start date, and publication status", () => {
    const event = new Event({
      title: "Town Festival",
      category: "Religious Festival",
      description: "Annual cultural festival",
      venue: "Pawapuri Temple Grounds",
      startDate: new Date(),
    });
    assert.equal(event.title, "Town Festival");
    assert.equal(event.status, "published");
    assert.equal(event.isPublished, true);
  });

  it("HeritageSite validates slug, coordinates, and twin heritage link", () => {
    const site = new HeritageSite({
      name: "Pawapuri Jain Tirth",
      slug: "pawapuri-jain-tirth",
      category: "Jain Heritage",
      historicalSignificance: "Nirvana Sthal of Lord Mahavira",
      narrative: "Historic ancient Pawa site.",
    });
    assert.equal(site.slug, "pawapuri-jain-tirth");
    assert.equal(site.isTwinHeritageHighlight, true);
  });

  it("MediaItem validates storageProvider and mimeType", () => {
    const media = new MediaItem({
      title: "Temple Photo",
      url: "https://example.com/photo.jpg",
      mimeType: "image/jpeg",
      storageProvider: "google_drive",
    });
    assert.equal(media.title, "Temple Photo");
    assert.equal(media.storageProvider, "google_drive");
  });

  it("AuditLog validates action types and entity types", async () => {
    const log = new AuditLog({
      adminUser: "651a2b3c4d5e6f7a8b9c0d1e",
      adminEmail: "admin@fazilnagar.com",
      action: "UPDATE",
      entityType: "SiteSettings",
      changesSummary: "Updated announcement banner",
    });
    assert.equal(log.action, "UPDATE");
    assert.equal(log.entityType, "SiteSettings");
  });
});

