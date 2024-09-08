import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, TouchableOpacity, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { Easing } from 'react-native-reanimated';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import MapView, {Callout, Marker, PROVIDER_DEFAULT} from "react-native-maps";
import { RootStackParamList } from '../types';
import * as Location from 'expo-location';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { TextInput } from 'react-native-gesture-handler';
import { FontAwesome } from '@expo/vector-icons';
import { GooglePlaceData, GooglePlaceDetail, GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { GOOGLE_KEY } from '../../api_keys';
import axios from 'axios';

interface Prediction {
    description: string;
    place_id: string;
    reference: string;
}

interface ApiResponse {
    predictions: Prediction[];
    status: string;
}

interface DestinationOption {
    address: string;
    city: string;
    place_id: string;
    reference: string;
};

interface PlaceDetailsResponse {
    result: {
        geometry: {
        location: {
            lat: number;
            lng: number;
        };
        };
    };
}

interface Marker {
    coordinate: {
        latitude: number,
        longitude: number
    }
}

export default function CreateRoute() {
    const navigation = useNavigation<NavigationProp<RootStackParamList>>();
    const bottomSheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ['90%', '45%', '25%', '10%'], []);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [destLatitude, setDestLatitude] = useState<number | null>(null);
    const [destLongitude, setDestLongitude] = useState<number | null>(null);
    const [destination, setDestination] = useState('');
    const [loadOptions, setLoadOptions] = useState(false);
    const [options, setOptions] = useState<Array<DestinationOption | any>>([]);
    const [markers, setMarkers] = useState<Marker[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        checkPermission();
    }, [])

    useEffect(() => {
        console.log("USE EFFECT MARKERS: ", markers.length);
        console.log("is loading: ", isLoading);
    }, [markers])

    const snapToIndex = (index: number) => {
        bottomSheetRef.current?.snapToIndex(index);
        // currentIndex == 1 ? setCurrentIndex(currentIndex-1) : setCurrentIndex(currentIndex+1);
    }

    const handleOutsidePress = () => {
        Keyboard.dismiss();
    }

    const checkPermission = async () => {
        const hasPermission = await Location.requestForegroundPermissionsAsync();
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
            setMarkers(prevMarkers => [
                ...prevMarkers,
                {
                    coordinate: {
                        latitude: location.coords.latitude!,
                        longitude: location.coords.longitude!
                    }
                }
            ]);

            setIsLoading(false);
        } catch (error) {
            alert('Failed to get location');
        }
    }

    const changeDestination = (dest: string) => {
        setDestination(dest);
        setLoadOptions(dest.length > 0);
        console.log(destination);
    }

    const setLocation = (data: GooglePlaceData, details: GooglePlaceDetail | null) => {
        console.log(data);
    }

    useEffect(() => {
        if (destination) {
          axios
            .get(`https://maps.googleapis.com/maps/api/place/autocomplete/json`, {
              params: {
                input: destination,
                key: GOOGLE_KEY,
                language: 'en',
              },
            })
            .then((response) => {
              handleResponse(response);
            })
            .catch((error) => {
              console.error('API Error:', error);
            });
        }
        // setOptions( [
        //     {
        //         address: "1600 Amphitheatre Parkway",
        //         city: "Mountain View, CA",
        //         place_id: "ChIJ2eUgeAK6j4ARbn5u_wAGqWA",
        //         reference: "ChIJ2eUgeAK6j4ARbn5u_wAGqWA"
        //     },
        //     {
        //         address: "1 Infinite Loop",
        //         city: "Cupertino, CA",
        //         place_id: "ChIJ2eUgeAK6j4ARbn5u_wAGqWA",
        //         reference: "ChIJ2eUgeAK6j4ARbn5u_wAGqWA"
        //     },
        //     {
        //         address: "350 5th Ave",
        //         city: "New York, NY",
        //         place_id: "ChIJW4j6XG5FwoAR3nXr2zqFqRM",
        //         reference: "ChIJW4j6XG5FwoAR3nXr2zqFqRM"
        //     },
        //     {
        //         address: "1600 Pennsylvania Ave NW",
        //         city: "Washington, DC",
        //         place_id: "ChIJCzZbXz7aFz4R7yU4x6fJ7tE",
        //         reference: "ChIJCzZbXz7aFz4R7yU4x6fJ7tE"
        //     },
        //     {
        //         address: "28 Liberty St",
        //         city: "New York, NY",
        //         place_id: "ChIJ3Q3dF2huEmsRUc6NqY6n5kQ",
        //         reference: "ChIJ3Q3dF2huEmsRUc6NqY6n5kQ"
        //     }
        // ]);
    }, [destination]);

    const handleResponse = (response: { data: ApiResponse }) => {
        const transformedOptions = response.data.predictions.map(prediction => {
            const loc = transformOptions(prediction.description);
            return {
                address: loc.address,
                city: loc.city,
                place_id: prediction.place_id,
                reference: prediction.reference
            };
        });
        setOptions(transformedOptions);
    }

    const transformOptions = (description: string) => {
        const parts = description.split(',');
        const address = parts[0];
        const city = parts.slice(1).join(", ").trim();

        return {
            address: address,
            city: city
        }
    }

    const chooseDestination = async (destination: DestinationOption) => {  
        setIsLoading(true);      
        const response = await axios.get<PlaceDetailsResponse>(`https://maps.googleapis.com/maps/api/place/details/json`, {
            params: {
                place_id: destination.place_id,
                key: GOOGLE_KEY,
                language: 'en',
            },
        });
        console.log("google api: ", response.data.result.geometry.location);
        const { lat, lng } = response.data.result.geometry.location;

        console.log("google lat: ", lat);
        console.log("google long: ", lng);

        if (lat && lng) {
            setMarkers(prevMarkers => [
                ...prevMarkers,
                {
                    coordinate: {
                        latitude: lat,
                        longitude: lng
                    }
                }
            ]);
        }
        setIsLoading(false);
        getCrimeInfo();
    }

    const getCrimeInfo = () => {
        Latitude: 39.1836
        Longitude: -96.5717
    }


    return (
        <TouchableWithoutFeedback onPress={handleOutsidePress}>
            <View style={styles.container}>
                <MapView style={styles.map} provider={PROVIDER_DEFAULT} key={`mapview-${isLoading}`}>
                    {markers.length > 0 && (markers.map((marker, index) => (
                        <Marker
                            coordinate={marker.coordinate}
                            key={index}
                        />
                    )))}
                    {isLoading && (
                        <View style={styles.loading}>
                            <ActivityIndicator size="large" color="white" />
                            <Text style={{color: "white", textAlign: "center"}}>We're getting your location...</Text>
                        </View>
                    )}
                </MapView>
                <BottomSheet
                    ref={bottomSheetRef}
                    index={1}
                    snapPoints={snapPoints}
                    handleIndicatorStyle={{backgroundColor: '#11233D', width: '20%'}}
                    backgroundStyle={{backgroundColor: '#0A141F'}}
                    style={{
                        flex: 1,
                    }}
                >
                    <BottomSheetView>
                        <View style={styles.inputContainer}>
                            <FontAwesome name="search" size={20} color="blue" style={styles.search} />
                            <TextInput 
                                style={styles.searchHeader} 
                                value={destination}
                                onChangeText={text => changeDestination(text)}
                                placeholder="Enter destination"
                                placeholderTextColor="#2D3FFF"
                                onFocus={() => snapToIndex(0)}
                            />
                        </View>
                        <View style={styles.destinations}>
                            {options.length > 0 && (
                                options.map((option, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        onPress={() => chooseDestination(option)}
                                        style={styles.destinationOption}
                                    >
                                        <Text style={styles.optionAddress}>{option.address}</Text>
                                        <Text style={styles.optionCity}>{option.city}</Text>
                                    </TouchableOpacity>
                                ))
                            )}
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
    loading: {
        position: 'absolute',
        top: '50%',
        left: '35%',
        transform: [{ translateX: -50 }, { translateY: -75 }], 
        backgroundColor: 'rgba(0, 0, 0, 0.5)', 
        padding: 20,
        borderRadius: 10,
        alignItems: 'center',
        zIndex: 10, 
    },
    overlayContainer: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: "red",  
    },
    inputContainer: {
        fontSize: 20,
        height: 60,  
        color: 'white',
        borderColor: "#2D3FFF",
        backgroundColor: "#ccd0ff",
        borderWidth: 2,
        borderRadius: 15,
        width: "90%",
        flexDirection: 'row', 
        alignItems: 'center', 
        marginLeft: "5%",
        marginBottom: 10,
    },
    search: {
        marginLeft: 10,
    },
    searchHeader: {
        fontSize: 20,
        marginLeft: 10,
        width: "80%",
        color: "#2D3FFF"
    },
    destinations: {
        marginLeft: "5%",
        backgroundColor: "#ccd0ff",
        width:"90%",
        borderWidth: 2,
        borderRadius: 15,
        borderColor: "#2D3FFF", 
        maxHeight: "800%",
    },
    destinationOption: {
        padding: 5,
        height: 50,
        borderRadius: 15,
        marginTop: 5,
        marginBottom: 5,
        color: "black"
    },
    optionAddress: {
        color: "black",
        flexWrap: "wrap",
        fontWeight: "700",
        fontSize: 18
    },
    optionCity: {
        color: "black",
        flexWrap: "wrap",
        fontWeight: "500",
        fontSize: 12,
    }
});
