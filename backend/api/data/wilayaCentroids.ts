/**
 * Approximate chief-town coordinates for every wilaya-level reference row
 * used by this app (the official 58 Algerian wilayas, plus the extra
 * sub-prefecture/daïra-level rows this project's `wilaya` table also carries
 * — ids 59+). Used only to place markers/route lines on the map; it is
 * reference data, not user data, so it is hardcoded rather than stored in
 * the database. Keyed by the wilaya `code` (2-digit string).
 */
export const WILAYA_CENTROIDS: Record<string, { lat: number; lon: number }> = {
  '01': { lat: 27.8742, lon: -0.2939 }, // Adrar
  '02': { lat: 36.1653, lon: 1.3347 }, // Chlef
  '03': { lat: 33.8, lon: 2.865 }, // Laghouat
  '04': { lat: 35.8773, lon: 7.1135 }, // Oum El Bouaghi
  '05': { lat: 35.5559, lon: 6.1741 }, // Batna
  '06': { lat: 36.7509, lon: 5.0567 }, // Bejaia
  '07': { lat: 34.8503, lon: 5.728 }, // Biskra
  '08': { lat: 31.6167, lon: -2.2167 }, // Bechar
  '09': { lat: 36.47, lon: 2.8277 }, // Blida
  '10': { lat: 36.3737, lon: 3.9023 }, // Bouira
  '11': { lat: 22.785, lon: 5.5228 }, // Tamanrasset
  '12': { lat: 35.4042, lon: 8.1242 }, // Tebessa
  '13': { lat: 34.8828, lon: -1.315 }, // Tlemcen
  '14': { lat: 35.37, lon: 1.32 }, // Tiaret
  '15': { lat: 36.7169, lon: 4.0497 }, // Tizi Ouzou
  '16': { lat: 36.7538, lon: 3.0588 }, // Alger
  '17': { lat: 34.6728, lon: 3.263 }, // Djelfa
  '18': { lat: 36.819, lon: 5.7667 }, // Jijel
  '19': { lat: 36.1898, lon: 5.4108 }, // Setif
  '20': { lat: 34.8303, lon: 0.1517 }, // Saida
  '21': { lat: 36.8761, lon: 6.9094 }, // Skikda
  '22': { lat: 35.19, lon: -0.6309 }, // Sidi Bel Abbes
  '23': { lat: 36.9, lon: 7.7667 }, // Annaba
  '24': { lat: 36.462, lon: 7.426 }, // Guelma
  '25': { lat: 36.365, lon: 6.6147 }, // Constantine
  '26': { lat: 36.2639, lon: 2.7539 }, // Medea
  '27': { lat: 35.9315, lon: 0.0892 }, // Mostaganem
  '28': { lat: 35.7058, lon: 4.5416 }, // M'Sila
  '29': { lat: 35.397, lon: 0.14 }, // Mascara
  '30': { lat: 31.9497, lon: 5.325 }, // Ouargla
  '31': { lat: 35.6971, lon: -0.6308 }, // Oran
  '32': { lat: 33.6836, lon: 1.0192 }, // El Bayadh
  '33': { lat: 26.4833, lon: 8.4667 }, // Illizi
  '34': { lat: 36.073, lon: 4.761 }, // Bordj Bou Arreridj
  '35': { lat: 36.7667, lon: 3.4667 }, // Boumerdes
  '36': { lat: 36.766, lon: 8.314 }, // El Tarf
  '37': { lat: 27.6711, lon: -8.1477 }, // Tindouf
  '38': { lat: 35.6075, lon: 1.8108 }, // Tissemsilt
  '39': { lat: 33.368, lon: 6.8675 }, // El Oued
  '40': { lat: 35.436, lon: 7.143 }, // Khenchela
  '41': { lat: 36.2862, lon: 7.9511 }, // Souk Ahras
  '42': { lat: 36.5893, lon: 2.4474 }, // Tipaza
  '43': { lat: 36.4504, lon: 6.2644 }, // Mila
  '44': { lat: 36.2642, lon: 1.968 }, // Ain Defla
  '45': { lat: 33.2667, lon: -0.3167 }, // Naama
  '46': { lat: 35.2976, lon: -1.1403 }, // Ain Temouchent
  '47': { lat: 32.4909, lon: 3.6736 }, // Ghardaia
  '48': { lat: 35.7373, lon: 0.556 }, // Relizane
  '49': { lat: 29.2639, lon: 0.23 }, // Timimoun
  '50': { lat: 21.3261, lon: 0.9517 }, // Bordj Badji Mokhtar
  '51': { lat: 34.4175, lon: 5.0658 }, // Ouled Djellal
  '52': { lat: 30.1333, lon: -2.1667 }, // Beni Abbes
  '53': { lat: 27.1939, lon: 2.4803 }, // In Salah
  '54': { lat: 19.5667, lon: 5.7667 }, // In Guezzam
  '55': { lat: 33.1071, lon: 6.0672 }, // Touggourt
  '56': { lat: 24.5547, lon: 9.4833 }, // Djanet
  '57': { lat: 33.95, lon: 5.9167 }, // El M'Ghair
  '58': { lat: 30.5833, lon: 2.8833 }, // El Meniaa
  // Extra sub-prefecture rows carried by this project's registry (not
  // official wilayas) — still reasonably precise chief-town coordinates.
  '59': { lat: 34.1131, lon: 2.1025 }, // Aflou
  '60': { lat: 32.8964, lon: 0.5461 }, // El Abiodh Sidi Cheikh
  '61': { lat: 34.3167, lon: -1.2667 }, // El Aricha
  '62': { lat: 35.2167, lon: 5.7 }, // El Kantara
  '63': { lat: 35.3833, lon: 5.3667 }, // Barika
  '64': { lat: 35.2113, lon: 4.1811 }, // Bou Saada
  '65': { lat: 34.75, lon: 8.0667 }, // Bir El Ater
  '66': { lat: 35.8667, lon: 2.7667 }, // Ksar El Boukhari
  '67': { lat: 35.2167, lon: 2.3167 }, // Ksar Chellala
  '68': { lat: 35.45, lon: 2.9 }, // Ain Oussara
  '69': { lat: 34.1667, lon: 3.5 }, // Messaad
};
