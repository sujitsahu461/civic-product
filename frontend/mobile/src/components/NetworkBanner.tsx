import React from 'react';
import { Text, View } from 'react-native';
import { useConnectivity } from '../state/ConnectivityContext';

export function NetworkBanner() {
  const { online } = useConnectivity();
  if (online) return null;
  return (
    <View style={{ backgroundColor: '#7A1F2B', paddingVertical: 6, paddingHorizontal: 12 }}>
      <Text style={{ color: '#fff', fontSize: 12, textAlign: 'center' }}>
        You are offline. You can still write a report; it is saved as a draft until you can send it.
      </Text>
    </View>
  );
}
