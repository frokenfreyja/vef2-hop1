CREATE TABLE categories (
  id serial primary key,
  title varchar(128) not null unique,
);

CREATE TABLE products (
  id serial primary key,
  title varchar(128) not null unique,
  price int not null,
  description text not null,
  image varchar(128),
  created timestamp with time zone default current_timestamp,
  category int not null,
  foreign key(category) references categories(id),
);

CREATE TABLE users (
  id serial primary key, 
  username varchar(128) not null unique,
  password varchar(128) not null,
  admin boolean default false, 
);

CREATE TABLE orders (
  id serial primary key, 
  foreign key(user) references users(id),
  order boolean default false,
  name varchar(128),
  address varchar(128), 
  created timestamp with time zone default current_timestamp,
);

CREATE TABLE cart_products (
  id serial primary key,
  foreign key(order) references orders(id),
  foreign key(product) references products(id),
  amount int,
);
