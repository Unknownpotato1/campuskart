// Seed data of 30+ real Indian universities/colleges grouped by state.
export interface CollegeSeed {
  name: string
  city: string
  state: string
}

export const COLLEGES_SEED: CollegeSeed[] = [
  // Uttar Pradesh
  { name: "Integral University", city: "Lucknow", state: "Uttar Pradesh" },
  { name: "IIT Kanpur", city: "Kanpur", state: "Uttar Pradesh" },
  { name: "BHU (Banaras Hindu University)", city: "Varanasi", state: "Uttar Pradesh" },
  { name: "Lucknow University", city: "Lucknow", state: "Uttar Pradesh" },
  { name: "Aligarh Muslim University (AMU)", city: "Aligarh", state: "Uttar Pradesh" },
  { name: "KNIT Sultanpur", city: "Sultanpur", state: "Uttar Pradesh" },
  { name: "HBTI Kanpur", city: "Kanpur", state: "Uttar Pradesh" },
  { name: "IIMT College of Engineering", city: "Greater Noida", state: "Uttar Pradesh" },
  // Delhi
  { name: "Delhi University (DU)", city: "Delhi", state: "Delhi" },
  { name: "IIT Delhi", city: "Delhi", state: "Delhi" },
  { name: "Jawaharlal Nehru University (JNU)", city: "Delhi", state: "Delhi" },
  { name: "Jamia Millia Islamia", city: "Delhi", state: "Delhi" },
  { name: "NSUT Delhi", city: "Delhi", state: "Delhi" },
  { name: "DTU (Delhi Technological University)", city: "Delhi", state: "Delhi" },
  // Maharashtra
  { name: "IIT Bombay", city: "Mumbai", state: "Maharashtra" },
  { name: "University of Mumbai", city: "Mumbai", state: "Maharashtra" },
  { name: "Savitribai Phule Pune University", city: "Pune", state: "Maharashtra" },
  { name: "COEP Pune", city: "Pune", state: "Maharashtra" },
  { name: "VJTI Mumbai", city: "Mumbai", state: "Maharashtra" },
  // Tamil Nadu
  { name: "Anna University", city: "Chennai", state: "Tamil Nadu" },
  { name: "VIT Vellore", city: "Vellore", state: "Tamil Nadu" },
  { name: "SRM Institute of Science and Technology", city: "Chennai", state: "Tamil Nadu" },
  { name: "IIT Madras", city: "Chennai", state: "Tamil Nadu" },
  { name: "NIT Trichy", city: "Tiruchirappalli", state: "Tamil Nadu" },
  // Karnataka
  { name: "IISc Bangalore", city: "Bengaluru", state: "Karnataka" },
  { name: "NIT Surathkal", city: "Mangaluru", state: "Karnataka" },
  { name: "RV College of Engineering", city: "Bengaluru", state: "Karnataka" },
  { name: "Bangalore University", city: "Bengaluru", state: "Karnataka" },
  // Rajasthan
  { name: "BITS Pilani", city: "Pilani", state: "Rajasthan" },
  { name: "IIT Jodhpur", city: "Jodhpur", state: "Rajasthan" },
  { name: "MNIT Jaipur", city: "Jaipur", state: "Rajasthan" },
  // West Bengal
  { name: "IIT Kharagpur", city: "Kharagpur", state: "West Bengal" },
  { name: "Jadavpur University", city: "Kolkata", state: "West Bengal" },
  // Telangana
  { name: "IIT Hyderabad", city: "Hyderabad", state: "Telangana" },
  { name: "IIIT Hyderabad", city: "Hyderabad", state: "Telangana" },
  // Gujarat
  { name: "IIT Gandhinagar", city: "Gandhinagar", state: "Gujarat" },
  { name: "NIRMA University", city: "Ahmedabad", state: "Gujarat" },
]

// States list derived from seed, for grouping in dropdowns
export const STATES_ORDER = [
  "Uttar Pradesh",
  "Delhi",
  "Maharashtra",
  "Tamil Nadu",
  "Karnataka",
  "Rajasthan",
  "West Bengal",
  "Telangana",
  "Gujarat",
]
