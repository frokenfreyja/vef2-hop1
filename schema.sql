CREATE TABLE categories (
  categoryid serial primary key,
  title character varying(255) not null unique
);

CREATE TABLE products (
  productid serial primary key,
  categoryid int not null,
  title character varying(255) not null unique,
  price int not null,
  description text not null,
  image character varying(255),
  created timestamp with time zone default current_timestamp,
  foreign key(categoryid) references categories(categoryid) ON DELETE CASCADE
);

CREATE TABLE users (
  userid serial primary key, 
  username varchar(128) not null unique,
  email varchar(128) not null unique,
  password character varying(255) NOT NULL,
  admin boolean default false
);

CREATE TABLE cart (
  cartid serial primary key,
  userid int not null,
  ordered bit default '0',
  name varchar(128),
  address varchar(128), 
  created timestamp with time zone,
  foreign key(userid) references users(userid)
);

CREATE TABLE cart_products (
  cartproductid serial primary key,
  cartid int not null,
  productid int not null,
  amount int,
  foreign key(cartid) references cart(cartid), 
  foreign key(productid) references products(productid)
);
