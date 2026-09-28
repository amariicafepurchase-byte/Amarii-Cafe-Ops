import { TaskDepartment } from '../types';

export interface TemplateTaskDef {
  title: string;
  details?: string;
  isPhotoMandatory?: boolean;
  isVideoMandatory?: boolean;
  isNoteMandatory?: boolean;
  mandatoryMedia?: 'none' | 'photo' | 'video';
  department?: TaskDepartment;
}

export const PREDEFINED_CHECKLIST_TEMPLATES: Record<string, TemplateTaskDef[]> = {
  'Kitchen Opening Checklist': [
    { title: 'Check Walk-in & Reach-in Chiller temps (≤ 4°C)', isPhotoMandatory: true, isNoteMandatory: true, department: 'Kitchen & Food Prep' },
    { title: 'Inspect Deep Freezer temperature (≤ -18°C)', isNoteMandatory: true, department: 'Kitchen & Food Prep' },
    { title: 'Sanitize stainless steel prep tables & cutting boards', department: 'Kitchen & Food Prep' },
    { title: 'Inspect fresh produce & morning mise-en-place line', isPhotoMandatory: true, department: 'Kitchen & Food Prep' },
  ],
  'Kitchen Closing Checklist': [
    { title: 'Turn off convection ovens, salamanders & deep fryers', department: 'Kitchen & Food Prep' },
    { title: 'Turn off primary LPG gas manifold valve', isVideoMandatory: true, department: 'Kitchen & Food Prep' },
    { title: 'Cover, date-label & store all prepared food in chillers', department: 'Kitchen & Food Prep' },
    { title: 'Scrub line floor drains & empty oil filter grease traps', isPhotoMandatory: true, department: 'Kitchen & Food Prep' },
  ],
  'Bar Opening Checklist': [
    { title: 'Purge espresso group heads & steam wands with boiling water', department: 'Barista & Beverage Station' },
    { title: 'Calibrate coffee grinder & dial in 36g espresso extraction yield', isVideoMandatory: true, department: 'Barista & Beverage Station' },
    { title: 'Restock dairy, plant milks & beverage syrups in under-counter chiller', isPhotoMandatory: true, department: 'Barista & Beverage Station' },
    { title: 'Verify ice maker bin purity and clean ice scoops', department: 'Barista & Beverage Station' },
  ],
  'Bar Closing Checklist': [
    { title: 'Perform 5x chemical backflush cycle with espresso machine cleaner', department: 'Barista & Beverage Station' },
    { title: 'Soak steam wands & portafilters in hot sanitizing solution', department: 'Barista & Beverage Station' },
    { title: 'Lock liquor rails and premium syrup inventory cabinet', isPhotoMandatory: true, department: 'Barista & Beverage Station' },
    { title: 'Log total discarded dairy milk and opened purees in notes', isNoteMandatory: true, department: 'Barista & Beverage Station' },
  ],
  'Cashier Opening/Closing': [
    { title: 'Power on PineLabs POS & test bank settlement connectivity', department: 'Cashier & Front of House (FOH)' },
    { title: 'Count physical opening register float (Rs. 10,000)', isPhotoMandatory: true, isNoteMandatory: true, department: 'Cashier & Front of House (FOH)' },
    { title: 'Verify thermal receipt printer paper and backup rolls', department: 'Cashier & Front of House (FOH)' },
    { title: 'Run day-end POS Z-Report & deposit verified cash in safe', isPhotoMandatory: true, isNoteMandatory: true, department: 'Cashier & Front of House (FOH)' },
  ],
  'Service Opening Checklist': [
    { title: 'Align all indoor and patio tables and clean chair cushions', department: 'Cashier & Front of House (FOH)' },
    { title: 'Set air conditioner to 22°C & configure background ambience music', department: 'Cashier & Front of House (FOH)' },
    { title: 'Inspect cutlery caddies, water carafes & QR code menu stands', department: 'Cashier & Front of House (FOH)' },
    { title: 'Conduct full floor walkthrough verifying pristine readiness', isPhotoMandatory: true, department: 'Cashier & Front of House (FOH)' },
  ],
  'Service Closing Checklist': [
    { title: 'Clear and sanitize all guest dining tables and chairs', department: 'Cashier & Front of House (FOH)' },
    { title: 'Stack patio furniture, retract outdoor umbrellas & secure gate', isPhotoMandatory: true, department: 'Cashier & Front of House (FOH)' },
    { title: 'Clean condiment holders, wipe menu books and recharge table tablets', department: 'Cashier & Front of House (FOH)' },
    { title: 'Turn off dining hall air conditioners, audio systems and lighting', department: 'Cashier & Front of House (FOH)' },
  ],
  'Service Opening/Closing': [
    { title: 'Align all indoor and patio tables and clean chair cushions', department: 'Cashier & Front of House (FOH)' },
    { title: 'Set air conditioner to 22°C & configure background ambience music', department: 'Cashier & Front of House (FOH)' },
    { title: 'Inspect cutlery caddies, water carafes & QR code menu stands', department: 'Cashier & Front of House (FOH)' },
    { title: 'Conduct full floor walkthrough verifying pristine readiness', isVideoMandatory: true, department: 'Cashier & Front of House (FOH)' },
  ],
  'Housekeeping Opening/Closing': [
    { title: 'Deep clean and disinfect customer restrooms & washroom fixtures', department: 'Closing & Maintenance' },
    { title: 'Restock scented liquid hand soaps, paper towels & tissues', department: 'Closing & Maintenance' },
    { title: 'Mop main cafe floor with antiseptic solution and dry thoroughly', isPhotoMandatory: true, department: 'Closing & Maintenance' },
    { title: 'Empty all outdoor and kitchen disposal bins into dumpster', department: 'Closing & Maintenance' },
  ],
};

export const STATION_DEFAULT_HEADERS: Record<string, string[]> = {
  Kitchen: ['Kitchen Opening Checklist', 'Kitchen Closing Checklist'],
  Bar: ['Bar Opening Checklist', 'Bar Closing Checklist'],
  Billing: ['Cashier Opening/Closing'],
  Service: ['Service Opening Checklist', 'Service Closing Checklist', 'Service Opening/Closing'],
  Housekeeping: ['Housekeeping Opening/Closing'],
  Manager: [
    'Kitchen Opening Checklist',
    'Kitchen Closing Checklist',
    'Bar Opening Checklist',
    'Bar Closing Checklist',
    'Cashier Opening/Closing',
    'Service Opening Checklist',
    'Service Closing Checklist',
    'Housekeeping Opening/Closing',
  ],
};
