import React from 'react';
import { View, StyleSheet, ViewStyle, Animated, Easing } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../styles/colors';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style
}) => {
  const { isDarkMode } = useTheme();
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          backgroundColor: isDarkMode ? colors.dark.surfaceSecondary : colors.light.surfaceSecondary,
          opacity,
        },
        style,
      ]}
    />
  );
};

interface CardSkeletonProps {
  showHeader?: boolean;
  lines?: number;
  style?: ViewStyle;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({
  showHeader = true,
  lines = 3,
  style
}) => {
  const { isDarkMode } = useTheme();

  return (
    <View style={[
      styles.cardSkeleton,
      { backgroundColor: isDarkMode ? colors.dark.surface : colors.light.surface },
      style
    ]}>
      {showHeader && (
        <View style={styles.headerSkeleton}>
          <SkeletonLoader width="60%" height={24} />
          <SkeletonLoader width={40} height={40} borderRadius={20} />
        </View>
      )}
      
      <View style={styles.contentSkeleton}>
        {Array.from({ length: lines }, (_, index) => (
          <View key={index} style={styles.lineSkeleton}>
            <SkeletonLoader 
              width={index === lines - 1 ? '70%' : '100%'} 
              height={16} 
              style={{ marginBottom: 8 }}
            />
          </View>
        ))}
      </View>
    </View>
  );
};

interface ListSkeletonProps {
  items?: number;
  itemHeight?: number;
  style?: ViewStyle;
}

export const ListSkeleton: React.FC<ListSkeletonProps> = ({
  items = 5,
  itemHeight = 80,
  style
}) => {
  return (
    <View style={style}>
      {Array.from({ length: items }, (_, index) => (
        <View key={index} style={[styles.listItem, { height: itemHeight }]}>
          <SkeletonLoader width={50} height={50} borderRadius={25} />
          <View style={styles.listItemContent}>
            <SkeletonLoader width="70%" height={18} style={{ marginBottom: 4 }} />
            <SkeletonLoader width="50%" height={14} />
          </View>
          <View style={styles.listItemRight}>
            <SkeletonLoader width={80} height={16} style={{ marginBottom: 4 }} />
            <SkeletonLoader width={60} height={12} />
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.light.surfaceSecondary,
  },
  cardSkeleton: {
    borderRadius: 16,
    padding: 20,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  headerSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  contentSkeleton: {
    flex: 1,
  },
  lineSkeleton: {
    marginBottom: 4,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.divider,
  },
  listItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  listItemRight: {
    alignItems: 'flex-end',
  },
});