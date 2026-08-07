/**
 * Configurazione centralizzata del Tennis Club Asiago.
 *
 * Gli orari NON sono qui: vengono letti dalla tabella `opening_hours` del database.
 */

export interface ClubContact {
  label: string;
  value: string;
  officiallyVerified: boolean;
}

export interface ClubInfo {
  name: string;
  tagline: string;
  location: string;
  parkName: string;
  contacts: {
    address: ClubContact;
    phone: ClubContact;
    email: ClubContact;
  };
  mapEmbedUrl: string;
  mapLink: string;
  coordinates: { lat: number; lng: number };
}

const LAT = 45.8728791103164;
const LNG = 11.503905348465413;

export const CLUB: ClubInfo = {
  name: 'Tennis Club Asiago',
  tagline: 'Il tennis nel cuore di Asiago',
  location: 'Asiago (VI)',
  parkName: 'Parco Millepini',
  contacts: {
    address: {
      label: 'Indirizzo',
      value: 'Parco Millepini, Asiago (VI)',
      officiallyVerified: false,
    },
    phone: {
      label: 'Telefono',
      value: '366 287 0953',
      officiallyVerified: false,
    },
    email: {
      label: 'Email',
      value: 'tennis@asiago.it',
      officiallyVerified: false,
    },
  },
  mapEmbedUrl: `https://www.google.com/maps?q=${LAT},${LNG}&z=16&output=embed`,
  mapLink: 'https://maps.app.goo.gl/ATgT3Y9RcHurxkda9',
  coordinates: { lat: LAT, lng: LNG },
};

export const IMAGES = {
  hero: 'https://images.pexels.com/photos/30894524/pexels-photo-30894524.jpeg?auto=compress&cs=tinysrgb&w=1600',
  park: 'https://images.pexels.com/photos/38377403/pexels-photo-38377403.jpeg?auto=compress&cs=tinysrgb&w=1200',
  court1: 'https://images.pexels.com/photos/30894524/pexels-photo-30894524.jpeg?auto=compress&cs=tinysrgb&w=1200',
  court2: 'https://images.pexels.com/photos/37785631/pexels-photo-37785631.jpeg?auto=compress&cs=tinysrgb&w=1200',
  court3: 'https://images.pexels.com/photos/38377403/pexels-photo-38377403.jpeg?auto=compress&cs=tinysrgb&w=1200',
} as const;

export const COURT_SURFACES = ['Terra rossa', 'Cemento', 'Sintetico', 'Erba'] as const;
