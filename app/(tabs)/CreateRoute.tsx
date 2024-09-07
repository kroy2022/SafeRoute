import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Text, ScrollView, PanResponder, Animated, TouchableOpacity, Dimensions, Button, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { Easing } from 'react-native-reanimated';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import MapView from "react-native-maps";
import { RootStackParamList } from '../types';
import * as Location from 'expo-location';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { TextInput } from 'react-native-gesture-handler';
import { FontAwesome } from '@expo/vector-icons';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { GOOGLE_KEY } from '@env';

export default function CreateRoute() {
    const navigation = useNavigation<NavigationProp<RootStackParamList>>();
    const bottomSheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ['80%', '45%', '25%', '10%'], []);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);

    useEffect(() => {
        checkPermission();
    }, [])

    const snapToIndex = (index: number) => {
        bottomSheetRef.current?.snapToIndex(index);
        // currentIndex == 1 ? setCurrentIndex(currentIndex-1) : setCurrentIndex(currentIndex+1);
    }

    const handleOutsidePress = () => {
        Keyboard.dismiss();
        console.log("press");
    }

    const checkPermission = async () => {
        const hasPermission = await Location.requestForegroundPermissionsAsync();
        console.log(hasPermission);
        if (!hasPermission.granted) {
            alert('Please grant permission');
            checkPermission();
        }
        getLocation();
    };

    const getLocation = async () => {
        try {
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High, 
            });
            setLatitude(location.coords.latitude);
            setLongitude(location.coords.longitude);
            console.log("Coordinates: ", location);
        } catch (error) {
            alert('Failed to get location');
            console.log("error: ", error);
        }
    }

    return (
        <TouchableWithoutFeedback onPress={handleOutsidePress}>
            <View style={styles.container}>
                <MapView style={styles.map} />
                <BottomSheet
                    ref={bottomSheetRef}
                    index={1}
                    snapPoints={snapPoints}
                    handleIndicatorStyle={{backgroundColor: '#11233D', width: '20%'}}
                    backgroundStyle={{backgroundColor: '#0A141F'}}
                >
                    <BottomSheetView style={styles.overlayContainer}>
                        <View style={styles.inputContainer}>
                            <FontAwesome name="search" size={20} color="blue" style={styles.search} />
                            <TextInput 
                                style={styles.searchHeader} 
                                placeholder="Enter destination"
                                placeholderTextColor="#2D3FFF"
                                onPress={() => snapToIndex(0)}
                            />
                        </View>
                        <View>
                            <GooglePlacesAutocomplete
                                placeholder='Search'
                                onPress={(data, details = null) => {
                                    // 'details' is provided when fetchDetails = true
                                    console.log(data, details);
                                }}
                                query={{
                                    key: 'YOUR API KEY',
                                    language: 'en',
                                }}
                            />
                        </View>
                    </BottomSheetView>
                </BottomSheet>
            </View>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    overlayContainer: {
        flex: 1,
        alignItems: 'center',
    },
    inputContainer: {
        fontSize: 20,
        height: "100%",
        color: 'white',
        borderColor: "#2D3FFF",
        backgroundColor: "#ccd0ff",
        borderWidth: 2,
        borderRadius: 15,
        width: "80%",
        flexDirection: 'row', 
        alignItems: 'center', 
    },
    search: {
        marginLeft: 10,
    },
    searchHeader: {
        marginLeft: 10,
        fontSize: 20,
        height: "100%",
        width: "70%",
    },
})