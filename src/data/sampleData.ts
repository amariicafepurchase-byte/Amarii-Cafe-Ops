export interface SamplePreset {
  id: string;
  name: string;
  badge: string;
  description: string;
  data: string;
}

export const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: 'master-daily-ops',
    name: 'Amarii Cafe Master Daily Checklist',
    badge: 'Master Shift',
    description: 'Comprehensive department-wise daily checklist for Kitchen, Bar, Housekeeping, Service, and Billing.',
    data: `AMARII CAFE MASTER DAILY CHECKLIST (ALL DEPARTMENTS)
1. [KITCHEN] [URGENT] Fresh Mozzarella & Cooking Cream critically low (Stock: 1.2kg, required 8kg for lunch rush). Contact Dairy Best vendor immediately for urgent 11 AM drop. (Assignee: Aditya)
2. [KITCHEN] Morning line check temperature logs: Walk-in chiller (3.4°C), Deep freezer (-18.2°C). Take photo of temperature sheet. (Assignee: Aditya)
3. [KITCHEN] Pizza dough fermentation batch (20kg) and pasta sauce mise en place prep. (Assignee: Aditya)
4. [KITCHEN] Check Fryer Station 2 pilot burner and grease filter cleaning before 12 PM prep. (Assignee: Aditya)
5. [BAR] [URGENT] Espresso machine backflush with Cafiza cleaning powder & calibrate grinder shot timer to 27s. (Assignee: Abhinash Dcosta)
6. [BAR] Restock cold brew kegs, vanilla syrups, fresh milk crates & verify crushed ice storage. (Assignee: Abhinash Dcosta)
7. [BAR] Wipe down beverage display shelves, cocktail shakers, and sanitize blenders. (Assignee: Abhinash Dcosta)
8. [HOUSEKEEPING] [URGENT] Washroom hourly hygiene audit: Refill hand soap, paper towels, and sanitize mirrors. (Assignee: Abhinash Dcosta)
9. [HOUSEKEEPING] Deep scrub dining floor tiles with disinfectant and wipe outdoor patio furniture. (Assignee: Abhinash Dcosta)
10. [HOUSEKEEPING] Sanitize dining tables, polish glass doors, and empty kitchen waste bins. (Assignee: Abhinash Dcosta)
11. [SERVICE] Cutlery polishing, condiment caddy refill, and napkin replenishment on all tables. (Assignee: Abhinash Dcosta)
12. [SERVICE] Conduct 11:30 AM pre-service menu briefing with floor captains on chef specials. (Assignee: Abhinash Dcosta)
13. [BILLING] Log opening cash float: Rs. 10,000 verified in Drawer 1 & Drawer 2. (Assignee: Hemen Das)
14. [BILLING] [PENDING] Swiggy / Zomato outlet menu status check: Verify 'Truffle Pasta' is active and sync POS taxes. (Assignee: Hemen Das)
15. [MANAGEMENT] [PENDING] Awaiting Area Manager approval for Rohan weekend shift swap request. (Assignee: Hemen Das)`,
  },
  {
    id: 'kitchen-closing',
    name: 'Kitchen & Bar Closing Checklist',
    badge: 'Closing Shift',
    description: 'Deep cleaning, gas bank shutdown, inventory wastage, and cash drawer day-end Z-Report.',
    data: `Amarii Cafe Daily Closing Checklist
- [KITCHEN] [URGENT] Turn off main gas bank valves and check fryer emergency shutoff switch. (Assignee: Aditya)
- [KITCHEN] Waste management log: Record kitchen prep discard in Amarii Cafe wastage register. (Assignee: Aditya)
- [KITCHEN] Clean exhaust hoods, line grill tops, and mop kitchen floors. (Assignee: Aditya)
- [BAR] Clean espresso steam wands, soak portafilters in hot water, and cover liquor bottles. (Assignee: Abhinash Dcosta)
- [HOUSEKEEPING] Final dining area sweep, mop restroom floor, and lock trash containers outside. (Assignee: Abhinash Dcosta)
- [BILLING] Run Day-End Z-Report on POS, count physical cash drawer vs card slips. (Assignee: Hemen Das)
- [MANAGEMENT] Secure safe drop, set night security alarm, and turn off facade neon signage. (Assignee: Hemen Das)`,
  },
  {
    id: 'hygiene-audit',
    name: 'Housekeeping & Sanitation Daily Checklist',
    badge: 'Hygiene Audit',
    description: 'Detailed sanitation, floor scrubbing, restroom inspection, and pest control verification.',
    data: `Amarii Cafe Sanitation & Housekeeping Daily Checklist
1. [HOUSEKEEPING] [URGENT] Restroom inspection: Sanitize taps, mop floor dry, and refill air freshener dispenser.
2. [HOUSEKEEPING] Dust AC ceiling vents, clean glass windows, and polish dining booth leather seats.
3. [HOUSEKEEPING] Sanitize POS counters, billing terminals, and server handwashing stations.
4. [HOUSEKEEPING] Collect dirty kitchen linen towels and bag for laundry pickup by 3 PM.
5. [KITCHEN] Wipe food contact surfaces with food-grade sanitizing solution (200 ppm quat).
6. [MANAGEMENT] Sign off on daily hygiene audit register and upload photos for weekly GM review.`,
  },
];
