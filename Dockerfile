FROM rust:latest

WORKDIR /app

COPY Cargo.toml Cargo.lock ./
COPY server/ server/
COPY shared/ shared/

RUN cargo build --release -p server

CMD ["./target/release/server"]
