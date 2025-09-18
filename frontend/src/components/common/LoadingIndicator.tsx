import React from 'react';
import { View, StyleSheet, Animated, ViewStyle, TextStyle } from 'react-native';
import { Text } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../styles/colors';

interface LoadingIndicatorProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  style?: ViewStyle;
  text?: string;
  textStyle?: TextStyle;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  size = 'medium',
  color,
  style,
  text,
  textStyle
}) => {
  const { isDarkMode } = useTheme();
  const spinValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const spinAnimation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    );

    spinAnimation.start();

    return () => spinAnimation.stop();
  }, [spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const getSize = () => {
    switch (size) {
      case 'small':
        return 20;
      case 'medium':
        return 32;
      case 'large':
        return 48;
      default:
        return 32;
    }
  };

  const indicatorSize = getSize();
  const indicatorColor = color || colors.primary;

  return (
    <View style={[styles.container, style]}>
      <Animated.View
        style={[
          styles.spinner,
          {
            width: indicatorSize,
            height: indicatorSize,
            borderColor: `${indicatorColor}30`,
            borderTopColor: indicatorColor,
            borderWidth: Math.max(2, indicatorSize * 0.08),
            transform: [{ rotate: spin }],
          },
        ]}
      />
      {text && (
        <Text style={[
          styles.text,
          { color: isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary },
          textStyle
        ]}>
          {text}
        </Text>
      )}
    </View>
  );
};

interface DotLoadingProps {
  size?: number;
  color?: string;
  style?: ViewStyle;
}

export const DotLoading: React.FC<DotLoadingProps> = ({
  size = 8,
  color,
  style
}) => {
  const { isDarkMode } = useTheme();
  const dotColor = color || (isDarkMode ? colors.dark.text : colors.light.text);
  
  const animatedValues = React.useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  React.useEffect(() => {
    const animations = animatedValues.map((animatedValue, index) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(index * 200),
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.delay(200),
        ])
      );
    });

    Animated.parallel(animations).start();

    return () => {
      animations.forEach(animation => animation.stop());
    };
  }, [animatedValues]);

  return (
    <View style={[styles.dotContainer, style]}>
      {animatedValues.map((animatedValue, index) => {
        const opacity = animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0.3, 1],
        });

        const scale = animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0.8, 1.2],
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              {
                width: size,
                height: size,
                backgroundColor: dotColor,
                opacity,
                transform: [{ scale }],
              },
            ]}
          />
        );
      })}
    </View>
  );
};

interface PulseLoadingProps {
  size?: number;
  color?: string;
  style?: ViewStyle;
}

export const PulseLoading: React.FC<PulseLoadingProps> = ({
  size = 40,
  color,
  style
}) => {
  const pulseValue = React.useRef(new Animated.Value(0)).current;
  const pulseColor = color || colors.primary;

  React.useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    pulseAnimation.start();

    return () => pulseAnimation.stop();
  }, [pulseValue]);

  const scale = pulseValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1.2],
  });

  const opacity = pulseValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.3],
  });

  return (
    <View style={[styles.pulseContainer, style]}>
      <Animated.View
        style={[
          styles.pulse,
          {
            width: size,
            height: size,
            backgroundColor: pulseColor,
            opacity,
            transform: [{ scale }],
          },
        ]}
      />
    </View>
  );
};

interface LoadingOverlayProps {
  visible: boolean;
  text?: string;
  backgroundColor?: string;
  children?: React.ReactNode;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  text = 'Cargando...',
  backgroundColor,
  children
}) => {
  const { isDarkMode } = useTheme();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, fadeAnim]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          backgroundColor: backgroundColor || (isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.9)'),
          opacity: fadeAnim,
        },
      ]}
    >
      <View style={styles.overlayContent}>
        {children || (
          <>
            <LoadingIndicator size="large" />
            <Text style={[
              styles.overlayText,
              { color: isDarkMode ? colors.dark.text : colors.light.text }
            ]}>
              {text}
            </Text>
          </>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    borderRadius: 50,
  },
  text: {
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  dotContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    borderRadius: 50,
    marginHorizontal: 3,
  },
  pulseContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulse: {
    borderRadius: 50,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  overlayContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
  },
  overlayText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});