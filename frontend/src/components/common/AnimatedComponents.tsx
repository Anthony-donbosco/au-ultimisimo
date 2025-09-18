import React from 'react';
import { 
  View, 
  StyleSheet, 
  ViewStyle, 
  Animated, 
  TouchableOpacity, 
  TouchableOpacityProps 
} from 'react-native';

interface FadeInViewProps {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  style?: ViewStyle;
}

export const FadeInView: React.FC<FadeInViewProps> = ({
  children,
  duration = 500,
  delay = 0,
  style
}) => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [fadeAnim, duration, delay]);

  return (
    <Animated.View style={[{ opacity: fadeAnim }, style]}>
      {children}
    </Animated.View>
  );
};

interface SlideInViewProps {
  children: React.ReactNode;
  direction?: 'left' | 'right' | 'up' | 'down';
  duration?: number;
  delay?: number;
  distance?: number;
  style?: ViewStyle;
}

export const SlideInView: React.FC<SlideInViewProps> = ({
  children,
  direction = 'up',
  duration = 500,
  delay = 0,
  distance = 50,
  style
}) => {
  const slideAnim = React.useRef(new Animated.Value(distance)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [slideAnim, opacityAnim, duration, delay]);

  const getTransform = () => {
    switch (direction) {
      case 'left':
        return [{ translateX: slideAnim }];
      case 'right':
        return [{ translateX: Animated.multiply(slideAnim, -1) }];
      case 'up':
        return [{ translateY: slideAnim }];
      case 'down':
        return [{ translateY: Animated.multiply(slideAnim, -1) }];
      default:
        return [{ translateY: slideAnim }];
    }
  };

  return (
    <Animated.View 
      style={[
        {
          opacity: opacityAnim,
          transform: getTransform(),
        },
        style
      ]}
    >
      {children}
    </Animated.View>
  );
};

interface ScaleInViewProps {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  initialScale?: number;
  style?: ViewStyle;
}

export const ScaleInView: React.FC<ScaleInViewProps> = ({
  children,
  duration = 300,
  delay = 0,
  initialScale = 0.8,
  style
}) => {
  const scaleAnim = React.useRef(new Animated.Value(initialScale)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: duration * 0.7,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [scaleAnim, opacityAnim, duration, delay]);

  return (
    <Animated.View
      style={[
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
        style
      ]}
    >
      {children}
    </Animated.View>
  );
};

interface AnimatedTouchableProps extends TouchableOpacityProps {
  children: React.ReactNode;
  scaleOnPress?: boolean;
  fadeOnPress?: boolean;
  scaleValue?: number;
  fadeValue?: number;
}

export const AnimatedTouchable: React.FC<AnimatedTouchableProps> = ({
  children,
  scaleOnPress = true,
  fadeOnPress = false,
  scaleValue = 0.95,
  fadeValue = 0.7,
  style,
  onPressIn,
  onPressOut,
  ...props
}) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const opacityAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = (event: any) => {
    const animations = [];
    
    if (scaleOnPress) {
      animations.push(
        Animated.timing(scaleAnim, {
          toValue: scaleValue,
          duration: 100,
          useNativeDriver: true,
        })
      );
    }
    
    if (fadeOnPress) {
      animations.push(
        Animated.timing(opacityAnim, {
          toValue: fadeValue,
          duration: 100,
          useNativeDriver: true,
        })
      );
    }

    if (animations.length > 0) {
      Animated.parallel(animations).start();
    }

    onPressIn?.(event);
  };

  const handlePressOut = (event: any) => {
    const animations = [];
    
    if (scaleOnPress) {
      animations.push(
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 300,
          friction: 10,
        })
      );
    }
    
    if (fadeOnPress) {
      animations.push(
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        })
      );
    }

    if (animations.length > 0) {
      Animated.parallel(animations).start();
    }

    onPressOut?.(event);
  };

  return (
    <TouchableOpacity
      {...props}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Animated.View
        style={[
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
          style,
        ]}
      >
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

interface StaggeredListProps {
  children: React.ReactElement[];
  staggerDelay?: number;
  initialDelay?: number;
  style?: ViewStyle;
}

export const StaggeredList: React.FC<StaggeredListProps> = ({
  children,
  staggerDelay = 100,
  initialDelay = 0,
  style
}) => {
  return (
    <View style={style}>
      {React.Children.map(children, (child, index) => (
        <SlideInView 
          key={index}
          delay={initialDelay + (index * staggerDelay)}
          duration={400}
          direction="up"
          distance={30}
        >
          {child}
        </SlideInView>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  // Estilos base para animaciones si es necesario
});