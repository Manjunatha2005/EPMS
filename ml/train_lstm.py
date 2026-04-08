"""
EcoSentinel LSTM Training Script
=================================
Trains a multi-variate LSTM model to predict PM2.5 levels
for the next 24-48 hours based on historical sensor data.

Usage:
    python ml/train_lstm.py --csv data/sample_pollution.csv --city delhi
"""
import argparse, os
import numpy as np
import pandas as pd
import joblib

from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error

# TensorFlow / Keras
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout, BatchNormalization
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau

# ---- Config ----
SEQ_LEN   = 24        # Look-back window (hours)
PRED_STEPS = 48       # Forecast horizon (hours)
FEATURES  = ["pm25", "pm10", "co2", "no2", "so2", "voc", "hour", "day_of_week"]
TARGET    = "pm25"
EPOCHS    = 100
BATCH     = 32
TEST_SPLIT = 0.2
MODEL_DIR  = "ml/model"


def load_data(csv_path: str, city: str | None = None) -> pd.DataFrame:
    df = pd.read_csv(csv_path, parse_dates=["timestamp"])
    df = df.sort_values("timestamp").reset_index(drop=True)
    if city:
        df = df[df["city"] == city]
    df["hour"]        = df["timestamp"].dt.hour
    df["day_of_week"] = df["timestamp"].dt.dayofweek
    # Forward-fill missing values
    df[FEATURES] = df[FEATURES].ffill().bfill()
    return df.dropna(subset=FEATURES)


def create_sequences(scaled: np.ndarray):
    X, y = [], []
    for i in range(len(scaled) - SEQ_LEN - PRED_STEPS + 1):
        X.append(scaled[i : i + SEQ_LEN])
        # Target: PM2.5 values for next PRED_STEPS hours (column 0)
        y.append(scaled[i + SEQ_LEN : i + SEQ_LEN + PRED_STEPS, 0])
    return np.array(X), np.array(y)


def build_lstm(seq_len: int, n_features: int) -> tf.keras.Model:
    model = Sequential([
        LSTM(128, return_sequences=True, input_shape=(seq_len, n_features)),
        BatchNormalization(),
        Dropout(0.25),

        LSTM(64, return_sequences=True),
        BatchNormalization(),
        Dropout(0.2),

        LSTM(32, return_sequences=False),
        Dropout(0.15),

        Dense(64, activation="relu"),
        Dropout(0.1),
        Dense(PRED_STEPS),  # Output: 48 PM2.5 predictions
    ])
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
        loss="huber",
        metrics=["mae"],
    )
    return model


def train(csv_path: str, city: str | None = None):
    print(f"\n{'='*50}")
    print("  EcoSentinel LSTM Training")
    print(f"{'='*50}\n")

    df = load_data(csv_path, city)
    print(f"✅ Loaded {len(df)} rows{f' for {city}' if city else ''}")

    # Scale features
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaled = scaler.fit_transform(df[FEATURES])

    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(scaler, f"{MODEL_DIR}/scaler.pkl")
    print(f"✅ Scaler saved to {MODEL_DIR}/scaler.pkl")

    X, y = create_sequences(scaled)
    print(f"✅ Created {len(X)} sequences (X: {X.shape}, y: {y.shape})")

    split = int(len(X) * (1 - TEST_SPLIT))
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]

    model = build_lstm(SEQ_LEN, len(FEATURES))
    model.summary()

    callbacks = [
        EarlyStopping(monitor="val_loss", patience=12, restore_best_weights=True),
        ModelCheckpoint(f"{MODEL_DIR}/lstm_pollution.h5", save_best_only=True, verbose=1),
        ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=5, min_lr=1e-6),
    ]

    print("\n🚀 Training started...\n")
    history = model.fit(
        X_train, y_train,
        validation_data=(X_test, y_test),
        epochs=EPOCHS,
        batch_size=BATCH,
        callbacks=callbacks,
        verbose=1,
    )

    # Evaluation
    y_pred = model.predict(X_test)
    rmse = np.sqrt(mean_squared_error(y_test.flatten(), y_pred.flatten()))
    mae  = mean_absolute_error(y_test.flatten(), y_pred.flatten())

    print(f"\n{'='*50}")
    print(f"  Training Complete")
    print(f"  RMSE : {rmse:.3f} µg/m³")
    print(f"  MAE  : {mae:.3f} µg/m³")
    print(f"  Model: {MODEL_DIR}/lstm_pollution.h5")
    print(f"{'='*50}\n")

    return model, history


def predict_future(model_path: str, scaler_path: str, recent_csv: str):
    """Run inference on recent data and print the 48-hour PM2.5 forecast."""
    import joblib
    from tensorflow.keras.models import load_model

    model  = load_model(model_path)
    scaler = joblib.load(scaler_path)

    df = load_data(recent_csv)
    scaled = scaler.transform(df[FEATURES])[-SEQ_LEN:]
    X = scaled.reshape(1, SEQ_LEN, len(FEATURES))

    pred_scaled = model.predict(X)[0]
    dummy = np.zeros((PRED_STEPS, len(FEATURES)))
    dummy[:, 0] = pred_scaled
    pred_values = scaler.inverse_transform(dummy)[:, 0].clip(min=0)

    print("\n📈 48-Hour PM2.5 Forecast:")
    for i, v in enumerate(pred_values):
        print(f"  +{i+1:2d}h : {v:.1f} µg/m³")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv",   default="data/sample_pollution.csv")
    parser.add_argument("--city",  default=None)
    parser.add_argument("--infer", action="store_true", help="Run inference only")
    args = parser.parse_args()

    if args.infer:
        predict_future(f"{MODEL_DIR}/lstm_pollution.h5", f"{MODEL_DIR}/scaler.pkl", args.csv)
    else:
        train(args.csv, args.city)
