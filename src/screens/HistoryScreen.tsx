import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getAuth } from 'firebase/auth';

import { COLORS } from '../constants/colors';
import type { News } from '../types/News';
import { getNews } from '../firebase/firestore';
import NewspaperCard from '../components/NewspaperCard';
import app from '../firebase/firebaseConfig';

const auth = getAuth(app);

const formatDate = (dateInput: any) => {
  if (!dateInput) return '';

  const date = (typeof dateInput.toDate === 'function')
    ? dateInput.toDate()
    : new Date(dateInput);

  return `${date.getMonth() + 1}月${date.getDate()}日`;
};

const getTime = (dateInput: any) => {
  if (!dateInput) return 0;

  if (typeof dateInput.toDate === 'function') {
    return dateInput.toDate().getTime();
  }

  return new Date(dateInput).getTime();
};

export default function HistoryScreen({ navigation }: any) {
  const [history, setHistory] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);

        const firebaseUser = auth.currentUser;

        // ログイン中のユーザーがいない場合
        if (!firebaseUser) {
          setHistory([]);
          return;
        }

        const newsList = await getNews();

        // ログイン中の高齢者自身に届いたNEWSだけ取得
        const myNews = newsList.filter(
          (news: News) => news.deliveredTo === firebaseUser.uid
        );

        // 新しいNEWSから順番に並べる
        const sortedNews = myNews.sort(
          (a, b) => getTime(b.createdAt) - getTime(a.createdAt)
        );

        setHistory(sortedNews);
      } catch (error) {
        console.error("履歴の取得に失敗しました:", error);
        setHistory([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const renderItem = ({ item }: { item: News }) => {
    return (
      <View style={styles.historyItemContainer}>
        <Text style={styles.dateHeader}>
          {formatDate(item.createdAt)}
        </Text>

        <NewspaperCard
          news={item}
          // 過去の履歴からはリアクションできない（あるいは既に送信済み）なので空関数を渡す
          onReaction={() => {}}
        />
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
        />
        <Text style={styles.loadingText}>読み込み中...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 戻るボタン（リストの上に配置） */}
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>
            ← ホームに戻る
          </Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          ニュース履歴
        </Text>
      </View>

      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            まだニュースがありません。
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textSecondary,
  },

  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 18,
    color: COLORS.textSecondary,
  },

  // ヘッダー周りのスタイル
  headerContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },

  backButton: {
    position: 'absolute',
    left: 16,
    zIndex: 1,
    paddingVertical: 8,
  },

  backButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },

  historyItemContainer: {
    marginBottom: 24,
  },

  dateHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
    marginBottom: 8,
    marginLeft: 4,
  },
});