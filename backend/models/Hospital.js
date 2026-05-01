class Hospital {
  constructor(data) {
    this.hospital_id = data.hospital_id;
    this.hospital_name = data.hospital_name;
    this.state = data.state;
    this.city = data.city;
    this.pincode = data.pincode;
    this.latitude = data.latitude;
    this.longitude = data.longitude;
    this.tier = data.tier;
    this.specializations = data.specializations;
    this.nabh_accredited = data.nabh_accredited;
    this.google_rating = data.google_rating;
    this.total_beds = data.total_beds;
    this.procedures_offered = data.procedures_offered;
    this.distance_from_city_center_km = data.distance_from_city_center_km;
    this.base_cost_multiplier = data.base_cost_multiplier;
  }
}

module.exports = Hospital;
