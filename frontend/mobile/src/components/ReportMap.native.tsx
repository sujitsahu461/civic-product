import React from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';

type Props = {
  coords: { lat: number; lng: number } | null;
  onChange: (coords: { lat: number; lng: number }) => void;
};

export default function ReportMap({ coords, onChange }: Props) {
  return (
    <MapView
      provider={PROVIDER_DEFAULT}
      style={s.map}
      initialRegion={{ latitude: coords?.lat ?? 20.95, longitude: coords?.lng ?? 85.1, latitudeDelta: 0.08, longitudeDelta: 0.08 }}
      region={coords ? { latitude: coords.lat, longitude: coords.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 } : undefined}
      onPress={(event) => {
        const { latitude, longitude } = event.nativeEvent.coordinate;
        onChange({ lat: latitude, lng: longitude });
      }}
    >
      {coords && <Marker coordinate={{ latitude: coords.lat, longitude: coords.lng }} title="Grievance location" />}
    </MapView>
  );
}

const s = StyleSheet.create({
  map: { width: '100%', height: 190, borderRadius: 16 },
});
